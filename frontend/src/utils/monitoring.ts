export const sendToBackend = async (metric: any) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    await fetch(`${apiUrl}/analytics/metric`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
      keepalive: true,
    });
  } catch (error) {
    console.error('Failed to report telemetry metric', error);
  }
};
