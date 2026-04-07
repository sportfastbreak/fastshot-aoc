const https = require('https');

exports.handler = async function(event, context) {
  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY    = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Cloudinary credentials' }) };
  }

  try {
    const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

    const searchBody = JSON.stringify({
      expression: 'folder:fastshot/aoc',
      max_results: 100,
      with_field: ['tags', 'context']
    });

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.cloudinary.com',
        path: `/v1_1/${CLOUD_NAME}/resources/search`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(searchBody)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error('JSON invalide: ' + body.slice(0, 200))); }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(searchBody);
      req.end();
    });

    const resources = data.resources || [];

    const photos = resources.map(resource => {
      // Parse Cloudinary context: "prenom=Jean|nom=Dupont|email=jean@x.com|newsletter=oui|match=AOC vs FC Muret"
      const ctx = resource.context?.custom || {};
      const prenom     = ctx.prenom     || '';
      const nom        = ctx.nom        || '';
      const email      = ctx.email      || '';
      const newsletter = ctx.newsletter || 'non';
      const match      = ctx.match      || '';

      const fullName = prenom && nom ? `${prenom} ${nom}` : (prenom || nom || '');

      return {
        id:          resource.public_id,
        url:         resource.secure_url,
        thumb:       resource.secure_url.replace('/upload/', '/upload/w_400,h_280,c_fill/'),
        filename:    resource.public_id.split('/').pop(),
        time:        new Date(resource.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date:        new Date(resource.created_at).toLocaleDateString('fr-FR'),
        created_at:  resource.created_at,
        bytes:       resource.bytes,
        tags:        resource.tags || [],
        // Participant data
        prenom,
        nom,
        fullName,
        email,
        newsletter,
        match,
      };
    });

    // Sort newest first
    photos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ photos, total: photos.length })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
