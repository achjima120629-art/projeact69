const https = require('https');
const fs = require('fs');

const url = 'https://docs.google.com/spreadsheets/d/1DrKZ_EosBp4jyjZzgzv15EPb0L6LMJwPk5eFPvyyD6I/export?format=csv';

function download(targetUrl) {
  https.get(targetUrl, function(response) {
    if (response.statusCode === 302 || response.statusCode === 301) {
      download(response.headers.location);
    } else if (response.statusCode === 200) {
      const file = fs.createWriteStream('projects.csv');
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Download completed successfully.');
      });
    } else {
      console.error('Failed to download file, status code: ' + response.statusCode);
    }
  }).on('error', function(err) {
    console.error('Error downloading file: ' + err.message);
  });
}

download(url);
