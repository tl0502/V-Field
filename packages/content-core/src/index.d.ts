export interface TextBlock { id: string; type: 'text'; version: 1; text: string }
export interface CarBlock { id: string; type: 'car'; version: 1; description: string }
export type ContentBlock = TextBlock | CarBlock;
export interface BlockRules { text: { enabled: boolean; required: boolean }; car: { enabled: boolean; min: number; max: number } }
export interface ArticleType { id: string; domainId: string; name: string; enabled: boolean; version: number; rules: BlockRules }
export interface Domain { id: string; slug: string; name: string }
export interface Tag { id: string; name: string; enabled: boolean; source?: 'member' | 'operator'; creatorUserId?: string }
export type TagInput = { id: string } | { name: string };
export interface ArticleInput { operationId: string; typeId: string; typeVersion: number; title: string; blocks: ContentBlock[]; tags: TagInput[] }
export interface Article {
  id: string; title: string; excerpt: string; domain: Domain; author: { userId: string }; createdAt: string;
  type: { id: string; name: string; version: number; rules: BlockRules }; tags: { id: string; name: string }[]; blocks: ContentBlock[];
}
export interface JoinRequest { id: string; userId: string; status: 'pending' | 'approved' | 'rejected' | 'cancelled'; createdAt: string; decidedAt: string | null }
export interface JoinState { domain: Domain; member: boolean; application: JoinRequest | null }
export const USER_ID_PATTERN: RegExp;
export const UUID_PATTERN: RegExp;
export const LIMITS: Readonly<{ title: number; text: number; car: number; cars: number; tag: number; tags: number; type: number }>;
export const DEFAULT_RULES: BlockRules;
export const TEMPLATES: readonly { type: string; version: number; name: string; fields: string[] }[];
export class ContentValidationError extends Error { code: string; issues: string[]; constructor(issues: string[]) }
export function codePointLength(value: string): number;
export function normalizeLines(value: string): string;
export function normalizeName(value: string): string;
export function validateTagName(value: unknown): string;
export function validateType(input: unknown): { name: string; normalizedName: string; enabled: boolean; rules: BlockRules };
export function prepareArticle(input: unknown): ArticleInput;
export function articleRuleIssues(blocks: ContentBlock[], rules: BlockRules): string[];
export function articleExcerpt(blocks: ContentBlock[]): string;
export function businessErrorMessage(error: unknown, fallback?: string): string;
export interface SelectedTag { id?: string; name: string }
export interface LocalDraft { schema: 1; accountId: string; domainId: string; typeId: string; typeVersion: number; operationId: string; title: string; blocks: ContentBlock[]; tags: SelectedTag[]; pendingSubmission?: ArticleInput }
export function editorId(prefix?: string): string;
export function emptyText(id?: string): TextBlock;
export function ensureTextSlots(blocks: ContentBlock[]): ContentBlock[];
export function insertCarAtCursor(blocks: ContentBlock[], focus: { id: string; cursor: number } | null): { blocks: ContentBlock[]; cardId: string };
export function removeCar(blocks: ContentBlock[], id: string): ContentBlock[];
export function swapCars(blocks: ContentBlock[], sourceId: string, targetId: string): ContentBlock[];
export function draftStorageKey(accountId: string, domainId: string): string;
export function decodeDraft(value: unknown, accountId: string, domainId: string): LocalDraft | null;
