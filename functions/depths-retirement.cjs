// Stop retired gameplay before Next initializes, including calls from old tabs.
module.exports=function retireDepths(req,res){
 const pathname=(req.url||'').split('?')[0].replace(/\/+$/,'');
 if(pathname==='/arena/depths'||pathname.startsWith('/arena/depths/')){
  res.redirect(302,'/arena');return true;
 }
 if(/^\/api\/arena\/(depthsState|claimDepthsReward|postDepthsBattleResult|verifyDepthsCompletion)$/.test(pathname)){
  res.setHeader('Cache-Control','no-store');
  res.status(410).json({error:'Depths has been retired. Visit the Arena Playtest instead.',retired:true,arenaUrl:'/arena'});return true;
 }
 return false;
};
