const crypto = require('node:crypto');
const https = require('node:https');

const algorithm = 'OSS4-HMAC-SHA256';
const hmac = (key, value, encoding) => crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding);
const objectPath = key => `/${String(key).split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
const timestamp = date => date.toISOString().replace(/[:-]|\.\d{3}/g, '');

function uploadToOss({ bucket, region, accessKeyId, accessKeySecret, key, contentType, body }) {
  if (!bucket || !region || !accessKeyId || !accessKeySecret) throw new Error('OSS server credentials are not configured.');
  const now = new Date();
  const date = timestamp(now);
  const shortDate = date.slice(0, 8);
  // OSS's VPC endpoint is bucket.oss-<region>-internal.aliyuncs.com.
  const host = `${bucket}.oss-${region}-internal.aliyuncs.com`;
  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-oss-content-sha256:${payloadHash}\nx-oss-date:${date}\n`;
  const signedHeaders = 'content-type;host;x-oss-content-sha256;x-oss-date';
  const canonicalRequest = `PUT\n${objectPath(key)}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${shortDate}/${region}/oss/aliyun_v4_request`;
  const stringToSign = `${algorithm}\n${date}\n${scope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
  const dateKey = hmac(`aliyun_v4${accessKeySecret}`, shortDate);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 'oss');
  const signingKey = hmac(serviceKey, 'aliyun_v4_request');
  const signature = hmac(signingKey, stringToSign, 'hex');
  const authorization = `${algorithm} Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: host, method: 'PUT', path: objectPath(key), headers: { Host: host, 'Content-Type': contentType, 'Content-Length': body.length, 'x-oss-content-sha256': payloadHash, 'x-oss-date': date, Authorization: authorization } }, response => {
      response.resume();
      if (response.statusCode >= 200 && response.statusCode < 300) return resolve();
      reject(new Error(`OSS upload failed (HTTP ${response.statusCode}).`));
    });
    request.on('error', error => reject(new Error(`Could not reach OSS: ${error.message}`)));
    request.end(body);
  });
}

module.exports = { uploadToOss };
