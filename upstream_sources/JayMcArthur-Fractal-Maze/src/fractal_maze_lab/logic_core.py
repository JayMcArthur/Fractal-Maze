from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Literal


ROOT = "ROOT"


class ExecutionError(ValueError):
    """Raised when a requested transition cannot be applied."""


@dataclass(frozen=True, order=True)
class Address:
    """A stack-style symbolic address such as `B.B.A.1`."""

    prefix: tuple[str, ...]
    point: str

    @classmethod
    def parse(cls, raw: str) -> "Address":
        parts = tuple(part for part in raw.split(".") if part)
        if not parts:
            raise ValueError("address cannot be empty")
        return cls(parts[:-1], parts[-1])

    @classmethod
    def root(cls, point: str) -> "Address":
        return cls((), point)

    def with_prefix(self, prefix: Iterable[str]) -> "Address":
        return Address(tuple(prefix), self.point)

    def stack(self) -> tuple[str, ...]:
        return (ROOT, *self.prefix)

    def compact(self) -> str:
        return "".join((*self.prefix, self.point))

    def __str__(self) -> str:
        if not self.prefix:
            return self.point
        return ".".join((*self.prefix, self.point))


@dataclass(frozen=True)
class RuntimeState:
    address: Address
    active_port: str | None = None

    @classmethod
    def start(cls, address: str | Address) -> "RuntimeState":
        if isinstance(address, str):
            address = Address.parse(address)
        return cls(address)

    @property
    def state(self) -> str:
        return self.address.point

    @property
    def stack(self) -> tuple[str, ...]:
        return self.address.stack()


@dataclass(frozen=True)
class Connection:
    id: str
    source: Address
    target: Address
    input: str
    label: str | None = None
    from_port: str | None = None

    @classmethod
    def parse(cls, id: str, source: str, target: str, input: str, label: str | None = None) -> "Connection":
        return cls(id, Address.parse(source), Address.parse(target), input, label)

    def matches(self, state: RuntimeState, input: str) -> bool:
        current = state.address
        if input != self.input or current.point != self.source.point:
            return False
        if self.from_port is not None and self.from_port != state.active_port:
            return False
        source_depth = len(self.source.prefix)
        if source_depth == 0:
            return True
        return current.prefix[-source_depth:] == self.source.prefix

    def apply(self, current: Address) -> Address:
        source_depth = len(self.source.prefix)
        base_prefix = current.prefix if source_depth == 0 else current.prefix[:-source_depth]
        return Address((*base_prefix, *self.target.prefix), self.target.point)

    def with_port(self, from_port: str) -> "Connection":
        return Connection(self.id, self.source, self.target, self.input, self.label, from_port)


@dataclass(frozen=True)
class ProofEdge:
    id: str
    source: Address
    target: Address
    input: str
    proof_type: str
    status: Literal["proved", "assumed", "disproved", "unknown"]
    explanation: str
    enabled_by_default: bool = False
    proof_steps: tuple[ProofPathStep, ...] = ()
    proof_method: str | None = None

    @classmethod
    def parse(
        cls,
        id: str,
        source: str,
        target: str,
        input: str,
        proof_type: str,
        status: Literal["proved", "assumed", "disproved", "unknown"],
        explanation: str,
        enabled_by_default: bool = False,
        proof_steps: tuple[ProofPathStep, ...] = (),
        proof_method: str | None = None,
    ) -> "ProofEdge":
        return cls(
            id=id,
            source=Address.parse(source),
            target=Address.parse(target),
            input=input,
            proof_type=proof_type,
            status=status,
            explanation=explanation,
            enabled_by_default=enabled_by_default,
            proof_steps=proof_steps,
            proof_method=proof_method,
        )

    def applies(self, current: Address, input: str) -> bool:
        if input != self.input or self.status not in {"proved", "assumed"}:
            return False
        if current.point != self.source.point:
            return False
        source_depth = len(self.source.prefix)
        if source_depth == 0:
            return True
        return current.prefix[-source_depth:] == self.source.prefix

    def apply(self, current: Address) -> Address:
        source_depth = len(self.source.prefix)
        base_prefix = current.prefix if source_depth == 0 else current.prefix[:-source_depth]
        return Address((*base_prefix, *self.target.prefix), self.target.point)

    def proof_validation_errors(self, graph: "AddressGraph") -> list[str]:
        errors: list[str] = []
        if self.status == "proved" and not self.proof_steps:
            return ["proved proof edge must include proof steps"]
        if not self.proof_steps:
            return errors
        if self.proof_method in {"infinite_hop", "simplified_infinite_hop"}:
            return self._infinite_hop_validation_errors(graph)
        if self.proof_steps[0].source != self.source:
            errors.append(f"proof must start at {self.source}")
        if self.proof_steps[-1].target != self.target:
            errors.append(f"proof must end at {self.target}")
        for previous, current in zip(self.proof_steps, self.proof_steps[1:]):
            if previous.target != current.source:
                errors.append(f"proof gap: {previous.target} then {current.source}")
        for step in self.proof_steps:
            if step.kind == "physical" and not graph._has_physical_connection(step.source, step.target):
                errors.append(f"missing physical proof step {step.source} -> {step.target}")
            if step.kind == "assumption" and step.source.prefix != step.target.prefix:
                errors.append(f"invalid assumption across different contexts {step.source} -> {step.target}")
        return errors

    def _infinite_hop_validation_errors(self, graph: "AddressGraph") -> list[str]:
        errors: list[str] = []
        if len(self.proof_steps) < 2:
            errors.append("infinite hop proof must include at least two convergence obligations")
        for step in self.proof_steps:
            if step.kind != "physical":
                errors.append(f"infinite hop obligation must be physical: {step.source} -> {step.target}")
            elif not graph._has_physical_connection(step.source, step.target):
                errors.append(f"missing physical proof step {step.source} -> {step.target}")
        target_prefixes = {step.target.prefix for step in self.proof_steps}
        if len(target_prefixes) != 1:
            errors.append("infinite hop obligations must converge into the same submaze prefix")
        return errors


@dataclass(frozen=True)
class ProofRule:
    id: str
    proof_type: Literal["infinite_hop", "cantor_hop"]
    from_point: str
    to_point: str
    explanation: str

    def applies(self, current: Address) -> bool:
        return current.point == self.from_point

    def apply(self, current: Address) -> Address:
        return Address(current.prefix, self.to_point)


@dataclass(frozen=True)
class ProofPathStep:
    kind: Literal["physical", "assumption"]
    source: Address
    target: Address

    @classmethod
    def parse(cls, kind: Literal["physical", "assumption"], source: str, target: str) -> "ProofPathStep":
        return cls(kind, Address.parse(source), Address.parse(target))


@dataclass(frozen=True)
class CantorHopRule:
    id: str
    from_point: str
    to_point: str
    proof_path: tuple[ProofPathStep, ...]
    explanation: str

    def applies(self, current: Address) -> bool:
        return current.point == self.from_point

    def target_for(self, current: Address) -> Address:
        return Address(current.prefix, self.to_point)


@dataclass(frozen=True)
class StepRecord:
    step_type: Literal["physical", "proof"]
    input: str
    source: Address
    target: Address
    transition_id: str
    stack_before: tuple[str, ...]
    stack_after: tuple[str, ...]
    explanation: str | None = None


@dataclass
class AddressGraph:
    id: str
    start: Address
    goals: set[Address]
    connections: list[Connection] = field(default_factory=list)
    proof_rules: dict[str, ProofRule] = field(default_factory=dict)
    cantor_rules: dict[str, CantorHopRule] = field(default_factory=dict)
    proof_edges: dict[str, ProofEdge] = field(default_factory=dict)

    def initial_state(self) -> RuntimeState:
        return RuntimeState(self.start)

    def is_goal(self, state: RuntimeState) -> bool:
        return state.address in self.goals

    def legal_connections(self, state: RuntimeState, input: str | None = None) -> list[Connection]:
        return [
            connection
            for connection in self.connections
            if (input is None or connection.input == input)
            and connection.matches(state, connection.input)
        ]

    def with_port(self, state: RuntimeState, active_port: str) -> RuntimeState:
        return RuntimeState(state.address, active_port)

    def apply(self, state: RuntimeState, input: str) -> tuple[RuntimeState, StepRecord]:
        matches = self.legal_connections(state, input)
        if not matches:
            raise ExecutionError(f"no transition for input {input!r} at {state.address}")
        if len(matches) > 1:
            ids = ", ".join(connection.id for connection in matches)
            raise ExecutionError(f"nondeterministic input {input!r} at {state.address}: {ids}")
        connection = matches[0]
        target = connection.apply(state.address)
        next_state = RuntimeState(target)
        return next_state, StepRecord(
            step_type="physical",
            input=input,
            source=state.address,
            target=target,
            transition_id=connection.id,
            stack_before=state.stack,
            stack_after=next_state.stack,
        )

    def apply_proof_edge(self, state: RuntimeState, proof_edge_id: str) -> tuple[RuntimeState, StepRecord]:
        try:
            edge = self.proof_edges[proof_edge_id]
        except KeyError as exc:
            raise ExecutionError(f"unknown proof edge {proof_edge_id!r}") from exc
        if not edge.applies(state.address, edge.input):
            raise ExecutionError(f"proof edge {proof_edge_id!r} does not apply at {state.address}")
        errors = edge.proof_validation_errors(self)
        if errors:
            raise ExecutionError(f"proof edge {proof_edge_id!r} is invalid: {'; '.join(errors)}")
        target = edge.apply(state.address)
        next_state = RuntimeState(target)
        return next_state, StepRecord(
            step_type="proof",
            input=edge.input,
            source=state.address,
            target=target,
            transition_id=edge.id,
            stack_before=state.stack,
            stack_after=next_state.stack,
            explanation=edge.explanation,
        )

    def apply_proof(self, state: RuntimeState, proof_rule_id: str) -> tuple[RuntimeState, StepRecord]:
        try:
            rule = self.proof_rules[proof_rule_id]
        except KeyError as exc:
            raise ExecutionError(f"unknown proof rule {proof_rule_id!r}") from exc
        if not rule.applies(state.address):
            raise ExecutionError(f"proof rule {proof_rule_id!r} does not apply at {state.address}")
        target = rule.apply(state.address)
        next_state = RuntimeState(target)
        return next_state, StepRecord(
            step_type="proof",
            input=proof_rule_id,
            source=state.address,
            target=target,
            transition_id=rule.id,
            stack_before=state.stack,
            stack_after=next_state.stack,
            explanation=rule.explanation,
        )

    def apply_cantor(self, state: RuntimeState, rule_id: str) -> tuple[RuntimeState, StepRecord]:
        try:
            rule = self.cantor_rules[rule_id]
        except KeyError as exc:
            raise ExecutionError(f"unknown Cantor rule {rule_id!r}") from exc
        errors = self.validate_cantor_rule(rule)
        if errors:
            raise ExecutionError(f"Cantor rule {rule_id!r} is invalid: {'; '.join(errors)}")
        if not rule.applies(state.address):
            raise ExecutionError(f"Cantor rule {rule_id!r} does not apply at {state.address}")
        target = rule.target_for(state.address)
        next_state = RuntimeState(target)
        return next_state, StepRecord(
            step_type="proof",
            input=rule_id,
            source=state.address,
            target=target,
            transition_id=rule.id,
            stack_before=state.stack,
            stack_after=next_state.stack,
            explanation=rule.explanation,
        )

    def validate_cantor_rule(self, rule: CantorHopRule) -> list[str]:
        errors: list[str] = []
        if not rule.proof_path:
            return ["proof path is empty"]
        if rule.proof_path[0].source != Address.root(rule.from_point):
            errors.append(f"proof path must start at {rule.from_point}")
        if rule.proof_path[-1].target != Address.root(rule.to_point):
            errors.append(f"proof path must end at {rule.to_point}")
        for previous, current in zip(rule.proof_path, rule.proof_path[1:]):
            if previous.target != current.source:
                errors.append(f"proof path gap: {previous.target} then {current.source}")
        for step in rule.proof_path:
            if step.kind == "physical" and not self._has_physical_connection(step.source, step.target):
                errors.append(f"missing physical proof step {step.source} -> {step.target}")
            if step.kind == "assumption" and not self._is_cantor_assumption(rule, step):
                errors.append(f"invalid Cantor assumption {step.source} -> {step.target}")
        return errors

    def _has_physical_connection(self, source: Address, target: Address) -> bool:
        for connection in self.connections:
            if source.point != connection.source.point:
                continue
            source_depth = len(connection.source.prefix)
            if source_depth > 0 and source.prefix[-source_depth:] != connection.source.prefix:
                continue
            if connection.apply(source) == target:
                return True
        return False

    @staticmethod
    def _is_cantor_assumption(rule: CantorHopRule, step: ProofPathStep) -> bool:
        return (
            len(step.source.prefix) > 0
            and step.source.prefix == step.target.prefix
            and step.source.point == rule.from_point
            and step.target.point == rule.to_point
        )

    def run(self, inputs: Iterable[str]) -> tuple[RuntimeState, list[StepRecord]]:
        state = self.initial_state()
        history: list[StepRecord] = []
        for input in inputs:
            state, record = self.apply(state, input)
            history.append(record)
        return state, history

    def accepts(self, inputs: Iterable[str]) -> bool:
        try:
            state, _ = self.run(inputs)
        except ExecutionError:
            return False
        return self.is_goal(state)

    def validation_errors(self) -> list[str]:
        errors: list[str] = []
        seen: set[tuple[str, str, str]] = set()
        for connection in self.connections:
            key = (str(connection.source), connection.input, str(connection.target))
            if key in seen:
                errors.append(f"duplicate connection {connection.source} --{connection.input}-> {connection.target}")
            seen.add(key)
        return errors


@dataclass(frozen=True)
class BlockAddress:
    """Coordinate/depth address spike for Fractal Block Maze-style logic."""

    x: int
    y: int
    depth: int
    local: str = "center"


@dataclass(frozen=True)
class BlockMoveGenerator:
    """Minimal local-neighborhood generator for coordinate-style symbolic addresses."""

    def move(self, address: BlockAddress, input: Literal["north", "east", "south", "west", "descend", "ascend"]) -> BlockAddress:
        if input == "north":
            return BlockAddress(address.x, address.y - 1, address.depth, address.local)
        if input == "east":
            return BlockAddress(address.x + 1, address.y, address.depth, address.local)
        if input == "south":
            return BlockAddress(address.x, address.y + 1, address.depth, address.local)
        if input == "west":
            return BlockAddress(address.x - 1, address.y, address.depth, address.local)
        if input == "descend":
            return BlockAddress(address.x, address.y, address.depth + 1, address.local)
        if input == "ascend":
            if address.depth == 0:
                raise ExecutionError("cannot ascend above depth 0")
            return BlockAddress(address.x, address.y, address.depth - 1, address.local)
        raise ExecutionError(f"unknown block move {input!r}")
