export async function onRequestGet(context) {
  const { env } = context;

  const token = env.BASEROW_TOKEN;
  const aidTableId = env.BASEROW_AID_TABLE_ID;
  const logTableId = env.BASEROW_LOG_TABLE_ID;

  if (!token || !aidTableId || !logTableId) {
    return new Response(
      JSON.stringify({ error: "Server environment variables not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const headers = {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
  };

  try {
    const [aidRes, logRes] = await Promise.all([
      fetch(
        `https://api.baserow.io/api/database/rows/table/${aidTableId}/?user_field_names=true&size=200`,
        { headers }
      ),
      fetch(
        `https://api.baserow.io/api/database/rows/table/${logTableId}/?user_field_names=true&size=200`,
        { headers }
      ),
    ]);

    if (!aidRes.ok || !logRes.ok) {
      throw new Error("Failed to fetch data from Baserow API.");
    }

    const aidData = await aidRes.json();
    const logData = await logRes.json();

    // Filtra apenas registos marcados como Verified / Published no Baserow
    const verifiedAid = (aidData.results || []).filter(
      (row) => row.Verified === true
    );
    const publishedLogs = (logData.results || [])
      .filter((row) => row.Published === true)
      .sort((a, b) => new Date(b.Date || 0) - new Date(a.Date || 0));

    return new Response(
      JSON.stringify({
        aid: verifiedAid,
        logs: publishedLogs,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=120", // Cache CDN de 2 minutos
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
