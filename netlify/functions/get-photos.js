exports.handler = async function(event, context) {
  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY    = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Cloudinary credentials' })
    };
  }

  try {
    const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?prefix=fastshot/aoc&max_results=100&context=true&tags=true`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: err })
      };
    }

    const data = await response.json();

    // Format photos for the admin
    const photos = data.resources.map(resource => ({
      id:        resource.public_id,
      url:       resource.secure_url,
      thumb:     resource.secure_url.replace('/upload/', '/upload/w_400,h_280,c_fill/'),
      filename:  resource.public_id.split('/').pop(),
      time:      new Date(resource.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date:      new Date(resource.created_at).toLocaleDateString('fr-FR'),
      bytes:     resource.bytes,
      tags:      resource.tags || [],
    }));

    // Sort newest first
    photos.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ photos, total: photos.length })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};      url:       resource.secure_url,
      thumb:     resource.secure_url.replace('/upload/', '/upload/w_400,h_280,c_fill/'),
      filename:  resource.public_id.split('/').pop(),
      time:      new Date(resource.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date:      new Date(resource.created_at).toLocaleDateString('fr-FR'),
      bytes:     resource.bytes,
      tags:      resource.tags || [],
    }));

    // Sort newest first
    photos.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ photos, total: photos.length })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
