from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator

from .graph_layout import layout_port_graph
from .package_loader import load_package
from .package_validation import PackageValidationResult, validate_package_file


BROWSER_FORMAT = "fmaze-browser-v0"
SCHEMA_FILENAME = "browser-package.schema.json"


class ExportError(RuntimeError):
    """Raised when a Source Package cannot be exported to a Browser Package."""


@dataclass(frozen=True)
class BrowserPackageExport:
    document: dict[str, Any]
    schema_errors: tuple[str, ...] = ()

    @property
    def ok(self) -> bool:
        return not self.schema_errors


def export_browser_package(
    package_path: str | Path,
    repo_root: str | Path | None = None,
) -> BrowserPackageExport:
    manifest_path = Path(package_path).resolve()
    if not manifest_path.exists():
        raise ExportError(f"package manifest does not exist: {manifest_path}")

    validation = validate_package_file(manifest_path)
    if not validation.valid:
        raise ExportError(_format_validation(manifest_path, validation))

    loaded = load_package(manifest_path)
    manifest = loaded.manifest
    logic = loaded.logic
    root = manifest_path.parent
    repo = Path(repo_root).resolve() if repo_root is not None else _infer_repo_root(manifest_path)

    document: dict[str, Any] = {
        "format": BROWSER_FORMAT,
        "id": manifest["id"],
        "title": manifest["title"],
        "primary_authoring": manifest["primary_authoring"],
        "source_root": _repo_relative(root, repo),
        "logic": logic,
    }

    solutions = _inline_solutions(manifest, root)
    if solutions:
        document["solutions"] = solutions

    visual_document, visual_assets = _inline_visual(loaded.visual, manifest, root, repo)
    if visual_document is not None:
        document["visual"] = visual_document
        document["visual_assets"] = visual_assets

    layout = _build_auto_graph_layout(loaded)
    if layout is not None:
        document["auto_graph_layout"] = layout

    modeling_status = logic.get("modeling_status")
    if modeling_status is not None:
        document["modeling_status"] = modeling_status

    provenance = manifest.get("provenance")
    if provenance is not None:
        document["provenance"] = provenance

    schema_errors = _validate_against_schema(document)
    return BrowserPackageExport(document=document, schema_errors=schema_errors)


def write_browser_package(
    package_path: str | Path,
    output_dir: str | Path,
    repo_root: str | Path | None = None,
) -> Path:
    export = export_browser_package(package_path, repo_root=repo_root)
    if not export.ok:
        raise ExportError(
            "browser package failed schema validation:\n  " + "\n  ".join(export.schema_errors)
        )
    output_root = Path(output_dir)
    output_root.mkdir(parents=True, exist_ok=True)
    target = output_root / f"{export.document['id']}.json"
    with target.open("w", encoding="utf-8") as handle:
        json.dump(export.document, handle, indent=2, sort_keys=False)
        handle.write("\n")
    return target


def _inline_solutions(manifest: dict[str, Any], package_root: Path) -> list[dict[str, Any]]:
    inlined: list[dict[str, Any]] = []
    for solution_ref in manifest.get("solutions", []) or []:
        if not isinstance(solution_ref, dict):
            continue
        href = solution_ref.get("href")
        ref_id = solution_ref.get("id")
        if not isinstance(href, str) or not isinstance(ref_id, str):
            continue
        solution_path = package_root / href
        body = _load_yaml_mapping(solution_path)
        body_id = body.get("id", ref_id)
        if body_id != ref_id:
            body["id"] = ref_id
        body.setdefault("format", solution_ref.get("format", "fmaze-solution-v0"))
        inlined.append(body)
    return inlined


def _inline_visual(
    visual: dict[str, Any] | None,
    manifest: dict[str, Any],
    package_root: Path,
    repo_root: Path,
) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    if visual is None:
        return None, []
    visual_assets: list[dict[str, Any]] = []
    for asset in visual.get("assets", []) or []:
        if not isinstance(asset, dict):
            continue
        href = asset.get("href")
        if not isinstance(href, str):
            continue
        resolved = (package_root / href).resolve()
        entry: dict[str, Any] = {
            "id": asset.get("id", ""),
            "href": _repo_relative(resolved, repo_root),
            "media_type": asset.get("media_type", ""),
        }
        role = asset.get("role")
        if isinstance(role, str):
            entry["role"] = role
        visual_assets.append(entry)
    return visual, visual_assets


def _build_auto_graph_layout(loaded) -> dict[str, Any] | None:
    if loaded.port_graph is None:
        return None
    layout = layout_port_graph(loaded.port_graph)
    return layout.to_dict()


def _format_validation(path: Path, validation: PackageValidationResult) -> str:
    lines = [f"package failed validation: {path}"]
    for issue in validation.issues:
        lines.append(f"  {issue.format()}")
    return "\n".join(lines)


def _repo_relative(path: Path, repo_root: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(repo_root).as_posix()
    except ValueError:
        return resolved.as_posix()


def _infer_repo_root(manifest_path: Path) -> Path:
    for parent in manifest_path.parents:
        if (parent / "packages").is_dir() and (parent / "src").is_dir():
            return parent.resolve()
    return manifest_path.parents[3].resolve()


def _load_yaml_mapping(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise ExportError(f"{path} must contain a YAML mapping")
    return data


def _validate_against_schema(document: dict[str, Any]) -> tuple[str, ...]:
    schema_path = Path(__file__).resolve().parents[2] / "schemas" / SCHEMA_FILENAME
    with schema_path.open("r", encoding="utf-8") as handle:
        schema = json.load(handle)
    validator = Draft202012Validator(schema)
    errors: list[str] = []
    for error in sorted(validator.iter_errors(document), key=lambda item: list(item.path)):
        location = "/".join(str(segment) for segment in error.path) or "<root>"
        errors.append(f"{location}: {error.message}")
    return tuple(errors)


def discover_packages(packages_root: str | Path) -> list[Path]:
    root = Path(packages_root)
    return sorted(root.glob("*/package.yml"))


def build_catalogue_index(
    packages_root: str | Path,
    repo_root: str | Path,
) -> dict[str, Any]:
    repo = Path(repo_root).resolve()
    entries: list[dict[str, Any]] = []
    for manifest_path in discover_packages(packages_root):
        try:
            export = export_browser_package(manifest_path, repo_root=repo)
        except ExportError:
            continue
        document = export.document
        logic = document.get("logic", {}) if isinstance(document.get("logic"), dict) else {}
        playable = logic.get("strategy") != "reference_record"
        modeling_status = document.get("modeling_status")
        status = "playable" if playable else "reference_only"
        if isinstance(modeling_status, dict) and isinstance(modeling_status.get("status"), str):
            status = modeling_status["status"]
        entries.append(
            {
                "id": document["id"],
                "title": document["title"],
                "strategy": logic.get("strategy"),
                "status": status,
                "has_visual": document.get("visual") is not None,
                "has_solutions": bool(document.get("solutions")),
            }
        )
    return {
        "format": "fmaze-browser-index-v0",
        "packages": entries,
    }


def write_catalogue_index(
    packages_root: str | Path,
    output_dir: str | Path,
    repo_root: str | Path,
) -> Path:
    index = build_catalogue_index(packages_root, repo_root)
    output = Path(output_dir) / "index.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        json.dump(index, handle, indent=2, sort_keys=False)
        handle.write("\n")
    return output
