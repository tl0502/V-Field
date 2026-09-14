export class CommunityError extends Error {
  constructor(code, statusCode = 400, issues = []) {
    super(code);
    this.name = 'CommunityError';
    this.code = code;
    this.statusCode = statusCode;
    this.issues = issues;
  }
}
