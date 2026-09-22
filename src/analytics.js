import { inject } from '@vercel/analytics';
// Only page views; never send wish text, names, strokes, or contact events.
if (!['localhost','127.0.0.1',''].includes(location.hostname)) {
  inject({mode:'production',beforeSend(event){const url=new URL(event.url);url.search='';url.hash='';return {...event,url:url.toString()};}});
}
