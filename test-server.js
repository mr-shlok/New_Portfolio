import http from 'node:http';
import { fork } from 'node:child_process';
import path from 'node:path';

const child = fork('tools/serve.mjs', ['5174'], { stdio: 'pipe' });

child.stdout.on('data', d => console.log('SERVER STDOUT:', d.toString()));
child.stderr.on('data', d => console.error('SERVER STDERR:', d.toString()));

setTimeout(() => {
  console.log('Sending request to http://127.0.0.1:5174/ ...');
  http.get('http://127.0.0.1:5174/', res => {
    console.log('STATUS:', res.statusCode);
    console.log('HEADERS:', res.headers);
    let len = 0;
    res.on('data', chunk => len += chunk.length);
    res.on('end', () => {
      console.log('BODY RECEIVED:', len, 'bytes');
      child.kill();
      process.exit(0);
    });
  }).on('error', err => {
    console.error('REQUEST ERROR:', err);
    child.kill();
    process.exit(1);
  });
}, 800);
