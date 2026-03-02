const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const PAGE_SIZE = 100;
const DELETE_BATCH_SIZE = 20;

exports.main = async (event = {}) => {
  const { dryRun = false } = event;

  let page = 0;
  let totalScanned = 0;
  const duplicateIds = [];
  const seen = new Map();

  while (true) {
    const res = await db.collection('likes')
      .orderBy('_id', 'asc')
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .get();

    const likes = res.data || [];
    if (!likes.length) {
      break;
    }

    likes.forEach((item) => {
      totalScanned += 1;
      const type = item.type || '';
      const key = item.key || '';
      const openid = item._openid || '';
      const uniqueKey = `${type}::${key}::${openid}`;

      if (!seen.has(uniqueKey)) {
        seen.set(uniqueKey, item._id);
        return;
      }
      duplicateIds.push(item._id);
    });

    page += 1;
    if (likes.length < PAGE_SIZE) {
      break;
    }
  }

  let removed = 0;
  if (!dryRun && duplicateIds.length) {
    for (let i = 0; i < duplicateIds.length; i += DELETE_BATCH_SIZE) {
      const batch = duplicateIds.slice(i, i + DELETE_BATCH_SIZE);
      const tasks = batch.map((id) => db.collection('likes').doc(id).remove());
      const results = await Promise.allSettled(tasks);
      removed += results.filter((r) => r.status === 'fulfilled').length;
    }
  }

  return {
    ok: true,
    dryRun,
    totalScanned,
    uniqueLikeKeys: seen.size,
    duplicateCount: duplicateIds.length,
    removed,
    skipped: dryRun ? duplicateIds.length : Math.max(duplicateIds.length - removed, 0),
  };
};
