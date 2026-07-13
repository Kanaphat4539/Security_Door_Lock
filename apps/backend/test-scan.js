const testScan = async () => {
  const formData = new FormData();
  formData.append('uid', '123456');
  
  try {
    const res = await fetch('http://localhost:3001/api/access-logs/scan', {
      method: 'POST',
      body: formData,
    });
    const text = await res.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error);
  }
};
testScan();
