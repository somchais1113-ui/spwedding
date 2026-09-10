// Vercel Node function; server credentials stay outside public/.
const {handler}=require('../lib/rsvp.cjs');
module.exports=(req,res)=>handler(req,res);
