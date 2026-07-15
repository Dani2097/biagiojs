import { createVercelHandler } from 'biagiojs/adapters/vercel';
import { tagsForPath } from '../lib/revalidate-tags.js';

export default createVercelHandler(import.meta.url, {
  cacheTags: (url) => tagsForPath(url),
});
