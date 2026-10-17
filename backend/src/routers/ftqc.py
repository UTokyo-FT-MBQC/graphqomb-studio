"""FTQC compilation API router."""

import math
from collections.abc import Mapping, Sequence
from collections.abc import Set as AbstractSet
from copy import copy

from fastapi import APIRouter, HTTPException
from graphqomb.clifford_algebra import COSET_NAMES
from graphqomb.common import Axis, Plane, determine_pauli_axis
from graphqomb.feedforward import Feedforward
from graphqomb.pauli_frame import PauliFrame, make_frame

from src.models.dto import (
    AxisName,
    CompiledFTQCResponseDTO,
    DetectorDiagnosticDTO,
    DetectorMismatchDTO,
    DetectorMismatchReason,
    FlowDefinitionDTO,
    PlaneName,
    ProjectPayloadDTO,
)
from src.services.converter import compute_zflow_from_xflow, dto_to_flow, dto_to_graphstate

router = APIRouter(prefix="/api", tags=["ftqc"])

AXIS_NAMES: dict[Axis, AxisName] = {Axis.X: "X", Axis.Y: "Y", Axis.Z: "Z"}
PLANE_NAMES: dict[Plane, PlaneName] = {Plane.XY: "XY", Plane.YZ: "YZ", Plane.XZ: "XZ"}


@router.post("/compile-ftqc", response_model=CompiledFTQCResponseDTO)
def compile_ftqc(project: ProjectPayloadDTO) -> CompiledFTQCResponseDTO:
    """Compile FTQC groups and diagnose detector determinism with GraphQOMB."""
    graph, node_map = dto_to_graphstate(project)
    reverse_map = {node: node_id for node_id, node in node_map.items()}
    xflow, zflow, cflow = dto_to_flow(project, node_map)
    if zflow is None:
        zflow = compute_zflow_from_xflow(graph, xflow)

    try:
        parity_check_group = (
            [{node_map[node_id] for node_id in group} for group in project.ftqc.parityCheckGroup]
            if project.ftqc is not None
            else []
        )
        parity_check_tags = project.ftqc.parityCheckTags if project.ftqc is not None else None
        logical_observables = {
            int(key): {node_map[node_id] for node_id in targets}
            for key, targets in (project.ftqc.logicalObservableGroup.items() if project.ftqc is not None else ())
        }
        feedforward = Feedforward(
            xflow,
            zflow,
            cflow,
            parity_check_group=parity_check_group,
            parity_check_tags=parity_check_tags or None,
            logical_observables=logical_observables,
        ).backpropagate(graph)
        pauli_frame = make_frame(
            graph,
            feedforward.xflow,
            feedforward.zflow or {},
            cflow=feedforward.cflow,
            parity_check_group=feedforward.parity_check_group,
        )
        compiled_detectors = [sorted(reverse_map[node] for node in group) for group in feedforward.parity_check_group]
        detector_diagnostics = _detector_diagnostics(pauli_frame, reverse_map)
        compiled_observables = {
            str(index): sorted(reverse_map[node] for node in targets)
            for index, targets in sorted(feedforward.logical_observables.items())
        }
    except (KeyError, ValueError, NotImplementedError) as exc:
        raise HTTPException(status_code=400, detail=f"Unable to compile FTQC groups: {exc}") from exc

    return CompiledFTQCResponseDTO(
        parityCheckGroup=compiled_detectors,
        parityCheckTags=feedforward.parity_check_tags,
        logicalObservableGroup=compiled_observables,
        detectorDiagnostics=detector_diagnostics,
        flow=FlowDefinitionDTO.model_validate(
            {
                "xflow": {
                    reverse_map[source]: sorted(reverse_map[target] for target in targets)
                    for source, targets in feedforward.xflow.items()
                },
                "zflow": {
                    reverse_map[source]: sorted(reverse_map[target] for target in targets)
                    for source, targets in (feedforward.zflow or {}).items()
                },
                "cflow": {
                    reverse_map[source]: {reverse_map[target]: COSET_NAMES[gate] for target, gate in targets.items()}
                    for source, targets in feedforward.cflow.items()
                },
            }
        ),
    )


def _detector_diagnostics(
    pauli_frame: PauliFrame,
    reverse_map: Mapping[int, str],
) -> list[DetectorDiagnosticDTO]:
    """Diagnose supported detectors while retaining unsupported groups for display."""
    diagnostics: list[DetectorDiagnosticDTO] = []
    supported_indices: list[int] = []
    supported_seeds: list[set[int]] = []
    nominal_groups: list[set[int]] = []
    analysis_frame = copy(pauli_frame)
    for index, group in enumerate(pauli_frame.parity_check_group):
        analysis_frame.parity_check_group = [group]
        try:
            nominal_groups.extend(analysis_frame.detector_groups())
        except (NotImplementedError, ValueError) as exc:
            diagnostics.append(DetectorDiagnosticDTO(deterministic=None, mismatches=[], unsupportedReason=str(exc)))
        else:
            supported_indices.append(index)
            supported_seeds.append(group)
            diagnostics.append(DetectorDiagnosticDTO(deterministic=None, mismatches=[]))

    analysis_frame.parity_check_group = supported_seeds
    supported_diagnostics = _pauli_detector_diagnostics(analysis_frame, nominal_groups, reverse_map)
    for index, diagnostic in zip(supported_indices, supported_diagnostics, strict=True):
        diagnostics[index] = diagnostic
    return diagnostics


def _pauli_detector_diagnostics(
    pauli_frame: PauliFrame,
    detector_groups: Sequence[AbstractSet[int]],
    reverse_map: Mapping[int, str],
) -> list[DetectorDiagnosticDTO]:
    """Return node-level reasons for GraphQOMB's detector determinism results."""
    determinism = pauli_frame.detector_determinism()
    stabilizers = pauli_frame.detector_stabilizers()
    graph = pauli_frame.graphstate
    unmeasured_outputs = graph.output_node_indices.keys() - graph.meas_bases.keys()
    diagnostics: list[DetectorDiagnosticDTO] = []

    for group, stabilizer, deterministic in zip(detector_groups, stabilizers, determinism, strict=True):
        mismatches: list[DetectorMismatchDTO] = []
        compared_nodes = (group | stabilizer.keys()) - unmeasured_outputs

        for node in sorted(compared_nodes, key=reverse_map.__getitem__):
            stabilizer_axis = stabilizer.get(node)
            in_detector_group = node in group
            meas_basis = graph.meas_bases.get(node)
            configured_measurement_axis = determine_pauli_axis(meas_basis) if meas_basis is not None else None
            measurement_axis = configured_measurement_axis if in_detector_group else None

            reason: DetectorMismatchReason | None = None
            if in_detector_group and meas_basis is not None and configured_measurement_axis is None:
                reason = "non-pauli-measurement"
            elif stabilizer_axis is None and measurement_axis is not None:
                reason = "missing-stabilizer-support"
            elif stabilizer_axis is not None and measurement_axis is None:
                reason = "missing-measurement-support"
            elif stabilizer_axis is not measurement_axis:
                reason = "axis-mismatch"

            if reason is None:
                continue

            mismatches.append(
                DetectorMismatchDTO(
                    nodeId=reverse_map[node],
                    stabilizerAxis=AXIS_NAMES[stabilizer_axis] if stabilizer_axis is not None else None,
                    detectorMeasurementAxis=AXIS_NAMES[measurement_axis] if measurement_axis is not None else None,
                    configuredMeasurementAxis=(
                        AXIS_NAMES[configured_measurement_axis] if configured_measurement_axis is not None else None
                    ),
                    measurementPlane=PLANE_NAMES[meas_basis.plane] if meas_basis is not None else None,
                    measurementAngleCoeff=meas_basis.angle / (2 * math.pi) if meas_basis is not None else None,
                    reason=reason,
                )
            )

        diagnostics.append(DetectorDiagnosticDTO(deterministic=deterministic, mismatches=mismatches))

    return diagnostics
