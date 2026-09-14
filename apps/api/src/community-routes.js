import { CommunityError } from './community-errors.js';

export function createCommunityRoutes({ auth, community, readBody, sessionToken, json }) {
  const lookups = new Map();
  function limitLookup(accountId) {
    const now = Date.now();
    if (lookups.size > 2000) for (const [key, value] of lookups) if (value.expires <= now) lookups.delete(key);
    let current = lookups.get(accountId);
    if (!current || current.expires <= now) { current = { count: 0, expires: now + 60_000 }; lookups.set(accountId, current); }
    if (++current.count > 30) throw new CommunityError('lookup_rate_limited', 429);
  }
  return async function route(req, res, url) {
    if (!community) return false;
    const path = url.pathname;
    let match;
    const identity = async (audience) => (await auth.readSession(sessionToken(req, audience), audience)).account.id;
    const send = (body) => json(res, 200, body);
    if (req.method === 'GET' && (match = path.match(/^\/api\/domains\/([^/]+)$/))) {
      send(await community.getDomain(match[1]));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/users\/by-user-id\/([^/]+)$/))) {
      const actorId = await identity('miniprogram');
      limitLookup(actorId);
      send(await community.findPublicUser(actorId, match[1]));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/admin\/platform\/accounts\/([^/]+)$/))) {
      send(await community.findManagementUser(await identity('admin-platform'), match[1]));
    } else if (req.method === 'POST' && (match = path.match(/^\/api\/admin\/platform\/domains\/([^/]+)\/operators$/))) {
      send(await community.assignOperator(await identity('admin-platform'), match[1], await readBody(req)));
    } else if (req.method === 'GET' && path === '/api/admin/domain/domains') {
      send(await community.listManagedDomains(await identity('admin-domain')));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/domains\/([^/]+)\/join-state$/))) {
      send(await community.getJoinState(await identity('miniprogram'), match[1]));
    } else if (req.method === 'POST' && (match = path.match(/^\/api\/domains\/([^/]+)\/join-requests$/))) {
      send(await community.applyToJoin(await identity('miniprogram'), match[1]));
    } else if (req.method === 'POST' && (match = path.match(/^\/api\/domains\/([^/]+)\/join-requests\/([^/]+)\/cancel$/))) {
      send(await community.cancelJoin(await identity('miniprogram'), match[1], match[2]));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/admin\/domain\/([^/]+)\/join-requests$/))) {
      send(await community.listJoinRequests(await identity('admin-domain'), match[1]));
    } else if (req.method === 'POST' && (match = path.match(/^\/api\/admin\/domain\/([^/]+)\/join-requests\/([^/]+)\/decision$/))) {
      send(await community.decideJoin(await identity('admin-domain'), match[1], match[2], (await readBody(req)).decision));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/admin\/domain\/([^/]+)\/types$/))) {
      send(await community.listTypes(await identity('admin-domain'), match[1]));
    } else if (req.method === 'POST' && (match = path.match(/^\/api\/admin\/domain\/([^/]+)\/types(?:\/([^/]+))?$/))) {
      send(await community.saveType(await identity('admin-domain'), match[1], match[2], await readBody(req)));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/admin\/domain\/([^/]+)\/tags$/))) {
      send(await community.listTags(await identity('admin-domain'), match[1], 'operator', url.searchParams.get('query') ?? ''));
    } else if (req.method === 'POST' && (match = path.match(/^\/api\/admin\/domain\/([^/]+)\/tags$/))) {
      send(await community.createTag(await identity('admin-domain'), match[1], (await readBody(req)).name));
    } else if (req.method === 'POST' && (match = path.match(/^\/api\/admin\/domain\/([^/]+)\/tags\/([^/]+)\/disable$/))) {
      send(await community.disableTag(await identity('admin-domain'), match[1], match[2]));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/domains\/([^/]+)\/types$/))) {
      send(await community.listTypes(await identity('miniprogram'), match[1], 'member'));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/domains\/([^/]+)\/tags$/))) {
      send(await community.listTags(await identity('miniprogram'), match[1], 'member', url.searchParams.get('query') ?? ''));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/domains\/([^/]+)\/articles$/))) {
      send(await community.listArticles(match[1], url.searchParams.get('cursor')));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/domains\/([^/]+)\/submissions\/([^/]+)$/))) {
      send(await community.getSubmission(await identity('miniprogram'), match[1], match[2]));
    } else if (req.method === 'POST' && (match = path.match(/^\/api\/domains\/([^/]+)\/articles$/))) {
      send(await community.publish(await identity('miniprogram'), match[1], await readBody(req, 1024 * 1024)));
    } else if (req.method === 'GET' && (match = path.match(/^\/api\/articles\/([^/]+)$/))) {
      send(await community.getArticle(match[1]));
    } else if (req.method === 'POST' && (match = path.match(/^\/api\/articles\/([^/]+)\/delete$/))) {
      send(await community.deleteArticle(await identity('miniprogram'), match[1]));
    } else return false;
    return true;
  };
}
