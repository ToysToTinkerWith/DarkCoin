const path=require('path'),esbuild=require('esbuild');
esbuild.buildSync({entryPoints:[path.resolve(__dirname,'../components/arena/playground/extra-preview.js')],outfile:path.resolve(__dirname,'../public/arena/playground/extra-preview.bundle.js'),bundle:true,minify:true,target:'chrome100',format:'iife',logLevel:'warning'});
