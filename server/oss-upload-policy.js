const crypto = require('node:crypto');

const algorithm = 'OSS4-HMAC-SHA256';

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding);
}

function compactTimestamp(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function createOssPostPolicy({ bucket, region, accessKeyId, accessKeySecret, key, contentType, maxBytes }) {
  if (!bucket || !region || !accessKeyId || !accessKeySecret) {
    throw new Error('OSS server credentials are not configured.');
  }

  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timestamp = compactTimestamp(now);
  const credential = `${accessKeyId}/${isoDate}/${region}/oss/aliyun_v4_request`;
  const expiration = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const policy = {
    expiration,
    conditions: [
      ['eq', '$key', key],
      ['eq', '$Content-Type', contentType],
      ['content-length-range', 1, maxBytes],
      ['eq', '$success_action_status', '204'],
      ['eq', '$x-oss-signature-version', algorithm],
      ['eq', '$x-oss-credential', credential],
      ['eq', '$x-oss-date', timestamp]
    ]
  };
  const encodedPolicy = Buffer.from(JSON.stringify(policy), 'utf8').toString('base64');
  const dateKey = hmac(`aliyun_v4${accessKeySecret}`, isoDate);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 'oss');
  const signingKey = hmac(serviceKey, 'aliyun_v4_request');
  const signature = hmac(signingKey, encodedPolicy, 'hex');

  return {
    url: `https://${bucket}.${region}.aliyuncs.com`,
    objectKey: key,
    expiresAt: expiration,
    fields: {
      key,
      policy: encodedPolicy,
      'x-oss-signature-version': algorithm,
      'x-oss-credential': credential,
      'x-oss-date': timestamp,
      'x-oss-signature': signature,
      'success_action_status': '204',
      'Content-Type': contentType
    }
  };
}

module.exports = { createOssPostPolicy };
