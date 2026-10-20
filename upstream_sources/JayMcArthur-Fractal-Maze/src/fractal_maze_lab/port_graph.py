from __future__ import annotations

from dataclasses import dataclass, field

from .logic_core import Address, AddressGraph, Connection, ProofEdge


@dataclass(frozen=True)
class Port:
    id: str
    address: Address
    label: str | None = None
    kind: str | None = None
    provenance: str | None = None


@dataclass(frozen=True)
class PortTransition:
    id: str
    source: Address
    target: Address
    input: str
    from_port: str
    label: str | None = None

    def to_connection(self) -> Connection:
        return Connection(
            id=self.id,
            source=self.source,
            target=self.target,
            input=self.input,
            label=self.label,
            from_port=self.from_port,
        )


@dataclass(frozen=True)
class PortTransitionGroup:
    id: str
    direction: str
    transition_ids: tuple[str, ...]


@dataclass
class PortGraph:
    id: str
    start: Address
    goals: set[Address]
    ports: dict[str, Port] = field(default_factory=dict)
    transitions: list[PortTransition] = field(default_factory=list)
    transition_groups: list[PortTransitionGroup] = field(default_factory=list)
    proof_edges: dict[str, ProofEdge] = field(default_factory=dict)

    @classmethod
    def normalize_connections(
        cls,
        id: str,
        start: Address,
        goals: set[Address],
        connections: list[Connection],
    ) -> "PortGraph":
        """Promote path-label transitions into source ports.

        The source PDA-like examples often identify a move by visible input
        labels. When more than one transition can match the same source/input,
        the visible label is too coarse. This normalizer gives every transition
        a stable source port, so PDA compilation can be deterministic.
        """

        graph = cls(id=id, start=start, goals=goals)
        for connection in connections:
            port_id = connection.from_port or f"{connection.source}@{connection.input}:{connection.id}"
            graph.ports.setdefault(
                port_id,
                Port(id=port_id, address=connection.source, label=connection.input),
            )
            graph.transitions.append(
                PortTransition(
                    id=connection.id,
                    source=connection.source,
                    target=connection.target,
                    input=connection.input,
                    from_port=port_id,
                    label=connection.label,
                )
            )
        return graph

    def compile_pda_stack(self, include_proof_edges: bool = False) -> AddressGraph:
        return AddressGraph(
            id=self.id,
            start=self.start,
            goals=set(self.goals),
            connections=[transition.to_connection() for transition in self.transitions],
            proof_edges=dict(self.proof_edges) if include_proof_edges else {},
        )

    def compile_address_graph(self) -> AddressGraph:
        return self.compile_pda_stack()

    def validation_errors(self) -> list[str]:
        errors: list[str] = []
        for port_id, port in self.ports.items():
            if port.id != port_id:
                errors.append(f"port key {port_id!r} does not match port id {port.id!r}")
        seen_transition_ids: set[str] = set()
        transition_ids: set[str] = set()
        for transition in self.transitions:
            if transition.id in seen_transition_ids:
                errors.append(f"duplicate transition id {transition.id!r}")
            seen_transition_ids.add(transition.id)
            transition_ids.add(transition.id)
            if transition.from_port not in self.ports:
                errors.append(f"transition {transition.id!r} references missing port {transition.from_port!r}")
            else:
                port = self.ports[transition.from_port]
                if port.address != transition.source:
                    errors.append(
                        f"transition {transition.id!r} source {transition.source} does not match port {transition.from_port!r} address {port.address}"
                    )
        seen_group_ids: set[str] = set()
        for group in self.transition_groups:
            if group.id in seen_group_ids:
                errors.append(f"duplicate transition group id {group.id!r}")
            seen_group_ids.add(group.id)
            if group.direction not in {"one_way", "two_way"}:
                errors.append(f"transition group {group.id!r} has unsupported direction {group.direction!r}")
            if group.direction == "one_way" and len(group.transition_ids) != 1:
                errors.append(f"one-way transition group {group.id!r} must reference exactly one transition")
            if group.direction == "two_way" and len(group.transition_ids) != 2:
                errors.append(f"two-way transition group {group.id!r} must reference exactly two transitions")
            for transition_id in group.transition_ids:
                if transition_id not in transition_ids:
                    errors.append(f"transition group {group.id!r} references missing transition {transition_id!r}")
        return errors

    def ambiguous_inputs(self) -> list[tuple[str, str]]:
        counts: dict[tuple[str, str], int] = {}
        for transition in self.transitions:
            key = (transition.source.point, transition.input)
            counts[key] = counts.get(key, 0) + 1
        return [key for key, count in counts.items() if count > 1]
