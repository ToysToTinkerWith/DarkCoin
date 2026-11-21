const path=require('path'),esbuild=require('esbuild');
esbuild.buildSync({entryPoints:[path.resolve(__dirname,'../components/arena/playground/attack-preview.js')],outfile:path.resolve(__dirname,'../public/arena/playground/attack-preview.bundle.js'),bundle:true,minify:true,target:'chrome100',format:'iife',logLevel:'warning'});
