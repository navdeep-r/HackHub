// One-off script to drop any index on the `hackathons` collection that includes the `tags` field
// Usage: from repository root run:
//   cd server
//   node scripts/drop_bad_index.js

const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hackhub';
  console.log('[drop_bad_index] connecting to', uri);

  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const coll = db.collection('hackathons');

    const indexes = await coll.indexes();
    console.log('[drop_bad_index] current indexes:');
    console.table(indexes.map(i => ({ name: i.name, key: JSON.stringify(i.key) })));

    // Find indexes whose key object contains 'tags' as one of the fields
    const candidates = indexes.filter(ix => Object.keys(ix.key || {}).includes('tags'));

    if (!candidates.length) {
      console.log('[drop_bad_index] no indexes found that include `tags` — nothing to drop');
      process.exit(0);
    }

    for (const ix of candidates) {
      try {
        console.log('[drop_bad_index] dropping index:', ix.name, ix.key);
        await coll.dropIndex(ix.name);
        console.log('[drop_bad_index] dropped', ix.name);
      } catch (err) {
        console.error('[drop_bad_index] failed to drop', ix.name, err.message || err);
      }
    }

    const after = await coll.indexes();
    console.log('[drop_bad_index] indexes after:');
    console.table(after.map(i => ({ name: i.name, key: JSON.stringify(i.key) })));

    process.exit(0);
  } catch (err) {
    console.error('[drop_bad_index] error:', err);
    process.exit(1);
  }
})();
