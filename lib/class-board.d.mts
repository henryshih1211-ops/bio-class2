export type BoardItem = {
  id: string;
  kind: 'homework' | 'task';
  title: string;
  description: string;
  course: string;
  owner: string;
  dueAt: string | null;
  status: 'open' | 'closed';
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};
export type ClassBoard = {
  schemaVersion: 1;
  classId: string;
  revision: string;
  updatedAt: string | null;
  items: BoardItem[];
};
export const CLASS_ID: string;
export const EMPTY_BOARD: ClassBoard;
export function validateBoard(value: unknown): ClassBoard;
export function dueState(
  item: BoardItem,
  now?: number,
): { label: string; tone: string };
export function sortItems(items: BoardItem[]): BoardItem[];
