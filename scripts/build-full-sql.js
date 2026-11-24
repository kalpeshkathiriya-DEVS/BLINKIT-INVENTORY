const fs = require('fs');
const path = require('path');

const sql01 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/01_initial_schema.sql'), 'utf8');
const sql02 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/02_missing_features.sql'), 'utf8');

console.log('01 size:', sql01.length, 'lines:', sql01.split('\n').length);
console.log('02 size:', sql02.length, 'lines:', sql02.split('\n').length);
