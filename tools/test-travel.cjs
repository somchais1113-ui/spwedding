/* Run: node --test tools/test-travel.cjs. No installed dependencies. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const root=path.resolve(__dirname,'..'),web=fs.existsSync(path.join(root,'dist'))?path.join(root,'dist'):root;
const H=require(path.join(web,'js/travel/travel-helpers.js')),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(web,'js/travel/locations.js'),'utf8'),context);const D=JSON.parse(JSON.stringify(context.window.WEDDING_TRAVEL_DATA));
test('All requested destinations are unique, editable and spatially valid',()=>{
 assert.equal(D.locations.length,16);assert.equal(new Set(D.locations.map(p=>p.id)).size,16);
 for(const p of D.locations){for(const key of ['id','nameTH','nameEN','category','description','distance','estimatedTravelTime','coordinates','googleMapsURL','images','highlight','recommendedTime','difficulty','suitableFor','tags'])assert.ok(key in p,p.id+': '+key);
 assert.ok(p.category.every(c=>D.modes.some(m=>m.id===c)));assert.ok(p.mapPosition.x>0&&p.mapPosition.x<D.map.width);assert.ok(p.mapPosition.y>0&&p.mapPosition.y<D.map.height);
 assert.ok(p.images[0].slot.endsWith(p.id+'.webp'));assert.ok(p.sources.length>0);if(p.parentDestinationId)assert.ok(D.locations.some(x=>x.id===p.parentDestinationId));
 }
});
test('Modes return only matching places and can return to all',()=>{
 assert.equal(H.filter(D.locations,'all').length,16);for(const mode of D.modes.slice(1)){const filtered=H.filter(D.locations,mode.id);assert.ok(filtered.length>=3);assert.ok(filtered.every(p=>p.category.includes(mode.id)));}
 assert.deepEqual(H.filter(D.locations,'missing'),[]);
});
test('Every suggested route resolves to real data entries and starts at the venue drawing',()=>{
 for(const mode of D.modes){const route=D.routes.find(r=>r.id===mode.id);assert.ok(route);assert.ok(route.stops.every(id=>D.locations.some(p=>p.id===id)));const points=H.routePoints(route,D.locations,D.map.venuePosition);assert.equal(points.length,route.stops.length+1);assert.deepEqual(points[0],D.map.venuePosition);const path=H.routePath(points);assert.ok(path.startsWith('M'));assert.ok(!/NaN|undefined/.test(path));}
});
test('Navigation uses confirmed coordinates or encoded place names; does not invent an origin',()=>{
 for(const p of D.locations){const u=new URL(H.navigation(p));assert.equal(u.hostname,'www.google.com');assert.equal(u.searchParams.get('api'),'1');assert.equal(u.searchParams.get('travelmode'),'driving');assert.equal(u.searchParams.get('origin'),null);assert.equal(u.searchParams.get('destination'),p.coordinates?p.coordinates.lat+','+p.coordinates.lng:p.mapsQuery);assert.equal(p.distance,null);assert.equal(p.estimatedTravelTime,null);}
 assert.equal(H.navigation({mapsQuery:'ร้าน A & B / สังคม'}).includes('destination='),true);
});
test('Unsafe content URLs are rejected without preventing local replacement images',()=>{
 for(const url of ['javascript:alert(1)','http://insecure.test','https://user:pass@example.com','not a URL'])assert.equal(H.https(url),null);
 assert.equal(H.navigation({googleMapsURL:'https://evil.test/?maps=google.com'}),null);
 assert.equal(H.imageURL('../secret.png'),null);assert.equal(H.imageURL('assets/../../secret.png'),null);assert.equal(H.imageURL('https://remote.test/a.png'),null);assert.ok(H.imageURL('assets/travel/locations/pha-tak-suea.webp'));
 assert.equal(H.coordinates({lat:200,lng:102}),false);assert.equal(H.coordinates({lat:18,lng:102}),true);
});
test('Phone/desktop camera stays bounded through zoom and large drags',()=>{
 for(const [width,height] of [[328,390],[390,390],[700,500]])for(const zoom of [1,1.8,2.8,20]){
 const c=H.camera(width,height,D.map,[],zoom);assert.ok(c.scale>0&&c.scale<=c.base*2.8);const moved=H.pan({...c,x:1e6,y:-1e6},width,height,D.map);assert.ok(Number.isFinite(moved.x)&&Number.isFinite(moved.y));assert.ok(moved.x<=Math.max(width/2,48));assert.ok(moved.y>=Math.min((height-D.map.height*c.scale)/2,height-D.map.height*c.scale-48));
 }
});
test('New section and module references preserve existing destinations and local typography',()=>{
 const html=fs.readFileSync(path.join(web,'index.html'),'utf8');assert.ok(html.indexOf('id="explore"')>html.indexOf('id="location"'));assert.ok(html.indexOf('id="explore"')>html.indexOf('id="wishes"'));assert.ok(html.indexOf('id="explore"')<html.indexOf('class="site-footer"'));assert.ok(!html.includes('travel-traveler'));
 for(const id of ['wishes','invitation','location','our-day','welcome'])assert.ok(html.includes('id="'+id+'"'));
 for(const name of ['OrangeAvenueDEMO-Regular.otf','OrangeAvenueOutlineDEMO-Regular.otf'])assert.ok(fs.existsSync(path.join(web,'assets/fonts',name)));
 for(const file of [D.map.image])assert.ok(fs.existsSync(path.join(web,file)));
});
test('Optional server serves travel images/modules with correct MIME and keeps wishes API available',async()=>{
 const {createWeddingServer}=await import(require('node:url').pathToFileURL(path.join(root,'server.mjs')));const server=createWeddingServer({webRoot:web});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base='http://127.0.0.1:'+server.address().port;
 for(const [file,type] of [[D.map.image,'image/webp'],['js/travel/travel.js','text/javascript'],['css/travel/travel.css','text/css']]){const res=await fetch(base+'/'+file);assert.equal(res.status,200);assert.ok(res.headers.get('content-type').startsWith(type));assert.ok((await res.arrayBuffer()).byteLength>100);}
 const status=await fetch(base+'/api/guestbook-status');assert.equal(status.status,200);assert.equal((await status.json()).service,'sp-wedding-guestbook-v1');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('Every destination has a source-backed image; local and remote delivery are explicit',()=>{
 let local=0,remote=0;for(const p of D.locations){const im=p.images[0];assert.ok(H.imageURL(im.src),p.id);assert.ok(H.https(im.sourcePageURL));assert.ok(im.credit);if(im.delivery==='local'){local++;assert.ok(fs.existsSync(path.join(web,im.src)));}else{remote++;assert.ok(['ak-d.tripcdn.com','i.ytimg.com'].includes(new URL(im.src).hostname));}}
 assert.equal(local,8);assert.equal(remote,8);
});
