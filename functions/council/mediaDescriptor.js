const MAX_MEDIA_BYTES = 5 * 1024 ** 4;
const EXTENSIONS = {
  jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',
  heic:'image/heic',heif:'image/heif',tif:'image/tiff',tiff:'image/tiff',bmp:'image/bmp',svg:'image/svg+xml',
  ico:'image/x-icon',mp4:'video/mp4',m4v:'video/mp4',mov:'video/quicktime',webm:'video/webm',mkv:'video/x-matroska',
  avi:'video/x-msvideo',ogv:'video/ogg',ogg:'video/ogg',mpg:'video/mpeg',mpeg:'video/mpeg','3gp':'video/3gpp',
};
function descriptor(input){
  const hash=String(input?.hash||'').toLowerCase(),size=Number(input?.size);
  const name=String(input?.name||'attachment').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').replace(/[\\/]/g,'_').slice(0,255)||'attachment';
  const supplied=String(input?.contentType||'').toLowerCase().split(';')[0].trim();
  const contentType=/^(image|video)\/[a-z0-9][a-z0-9.+-]*$/.test(supplied)?supplied:EXTENSIONS[name.split('.').at(-1).toLowerCase()];
  if(!/^[a-f0-9]{64}$/.test(hash))throw Error('A complete file SHA-256 is required.');
  if(!Number.isSafeInteger(size)||size<1)throw Error('Choose a nonempty image or video.');
  if(size>MAX_MEDIA_BYTES)throw Error('Firebase Storage supports individual files up to 5 TiB.');
  if(!contentType)throw Error('Choose an image or video file.');
  return {v:1,hash,size,contentType,name};
}
module.exports={MAX_MEDIA_BYTES,descriptor};
