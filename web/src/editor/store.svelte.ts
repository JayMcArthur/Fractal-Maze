import { compileEditorModel, emptyEditorModel, type EditorConnection, type EditorModel } from './model';

const DRAFT_STORAGE_PREFIX = 'editor:draft:';

export interface EditorStore {
  readonly draftId: string;
  readonly model: EditorModel;
  setPackageId(id: string): void;
  setTitle(title: string): void;
  setStart(start: string): void;
  setGoals(goals: string[]): void;
  addJunction(junction: string): void;
  removeJunction(junction: string): void;
  addSubmaze(submaze: string): void;
  removeSubmaze(submaze: string): void;
  addConnection(connection: EditorConnection): void;
  removeConnection(connectionId: string): void;
  clearDraft(): void;
  exportSnapshot(): EditorModel;
}

export function createEditorStore(draftId: string): EditorStore {
  const loaded = loadDraft(draftId);
  let model = $state<EditorModel>(loaded ?? emptyEditorModel(draftId));

  function persist(): void {
    persistDraft(model);
  }

  $effect(() => {
    persistDraft(model);
  });

  function mutate(updater: (current: EditorModel) => EditorModel): void {
    model = updater(model);
  }

  return {
    get draftId() {
      return draftId;
    },
    get model() {
      return model;
    },
    setPackageId(id: string) {
      mutate((current) => ({ ...current, packageId: id }));
    },
    setTitle(title: string) {
      mutate((current) => ({ ...current, title }));
    },
    setStart(start: string) {
      mutate((current) => ({ ...current, startJunction: start }));
    },
    setGoals(goals: string[]) {
      mutate((current) => ({ ...current, goalJunctions: [...goals] }));
    },
    addJunction(junction: string) {
      mutate((current) =>
        current.junctions.includes(junction)
          ? current
          : { ...current, junctions: [...current.junctions, junction] },
      );
    },
    removeJunction(junction: string) {
      mutate((current) => ({
        ...current,
        junctions: current.junctions.filter((id) => id !== junction),
        goalJunctions: current.goalJunctions.filter((id) => id !== junction),
        startJunction: current.startJunction === junction ? '' : current.startJunction,
      }));
    },
    addSubmaze(submaze: string) {
      mutate((current) =>
        current.submazes.includes(submaze)
          ? current
          : { ...current, submazes: [...current.submazes, submaze] },
      );
    },
    removeSubmaze(submaze: string) {
      mutate((current) => ({
        ...current,
        submazes: current.submazes.filter((id) => id !== submaze),
      }));
    },
    addConnection(connection: EditorConnection) {
      mutate((current) => ({
        ...current,
        connections: [...current.connections.filter((c) => c.id !== connection.id), connection],
      }));
    },
    removeConnection(connectionId: string) {
      mutate((current) => ({
        ...current,
        connections: current.connections.filter((c) => c.id !== connectionId),
      }));
    },
    clearDraft() {
      mutate(() => emptyEditorModel(draftId));
      try {
        localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${draftId}`);
      } catch {
        /* localStorage unavailable */
      }
    },
    exportSnapshot() {
      return { ...model, connections: [...model.connections] };
    },
  };
}

function loadDraft(draftId: string): EditorModel | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${draftId}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as EditorModel;
    if (data.draftId !== draftId) return null;
    return data;
  } catch {
    return null;
  }
}

function persistDraft(model: EditorModel): void {
  try {
    localStorage.setItem(`${DRAFT_STORAGE_PREFIX}${model.draftId}`, JSON.stringify(model));
  } catch {
    /* localStorage unavailable */
  }
}

export function previewCompiledModel(model: EditorModel) {
  return compileEditorModel(model, { lenient: true });
}
