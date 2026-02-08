const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  );
};

const formatNumber = (n) => {
  const s = n.toString();
  return s[1] ? s : '0' + s;
};

// 简单字符串哈希（非安全，仅用于生成本地键）
const simpleHash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16);
};

// 生成用户键：未登录为 guest；登录则基于用户信息生成稳定键
const getUserKey = (userInfo, isLoggedIn) => {
  if (!isLoggedIn || !userInfo) return 'guest';
  const base = `${userInfo.nickName || ''}|${userInfo.avatarUrl || ''}`;
  return `user_${simpleHash(base)}`;
};

module.exports = { formatTime, simpleHash, getUserKey };