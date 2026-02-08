const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = (event, context, callback) => {
  const wxContext = cloud.getWXContext();
  console.log('login function invoked');

  const result = {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    debug: 'login_v1'
  };
  console.log('login return', result);
  if (typeof callback === 'function') {
    callback(null, result);
    return;
  }
  return result;
};