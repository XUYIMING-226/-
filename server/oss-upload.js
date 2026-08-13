const OSS = require('ali-oss');

function uploadToOss({ bucket, region, accessKeyId, accessKeySecret, key, contentType, body }) {
  if (!bucket || !region || !accessKeyId || !accessKeySecret) throw new Error('OSS server credentials are not configured.');
  const client = new OSS({
    region: `oss-${region}`,
    accessKeyId,
    accessKeySecret,
    bucket,
    authorizationV4: true,
    internal: true
  });
  return client.put(key, body, { headers: { 'Content-Type': contentType } });
}

module.exports = { uploadToOss };
