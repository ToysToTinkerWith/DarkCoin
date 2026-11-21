const { mediaUrl } = require('../market/media');

function councilAssetMetadata(id, params = {}) {
  const assetId = Number(id);
  const known = assetId === 0 ? { name: 'ALGO', image: '/AlgoWhite.svg' }
    : assetId === 1088771340 ? { name: 'Dark Coin', image: '/invDC.svg' } : null;
  let published = mediaUrl(params.url, params);
  if (/#arc3$|\.json(?:#.*)?$|\.(?:mp4|webm|glb|gltf)(?:[?#]|$)/i.test(params.url || '')) published = '';
  return {
    id: assetId,
    name: known?.name || params.unitName || params.name || `Asset ${assetId}`,
    fullName: params.name || known?.name || `Asset ${assetId}`,
    unitName: assetId === 0 ? 'ALGO' : params.unitName || params.name || `ASA ${assetId}`,
    decimals: assetId === 0 ? 6 : Number(params.decimals),
    image: known?.image || published || `https://asa-list.tinyman.org/assets/${assetId}/icon.png`,
  };
}

module.exports = { councilAssetMetadata };
