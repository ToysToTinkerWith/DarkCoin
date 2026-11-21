export default function depthsRetired(_req,res){
 res.setHeader('Cache-Control','no-store');
 return res.status(410).json({error:'Depths has been retired. Visit the Arena Playtest instead.',retired:true,arenaUrl:'/arena'});
}
