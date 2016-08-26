var https = require('https');

var api_key = '';
var app_key = '';

exports.getInfrastructure = function(event,context) {

    var amount_servers = 0;

    https.get({
        host: 'app.datadoghq.com',
        path: '/reports/v2/overview?window=3h&metrics=&with_apps=true&with_sources=true&with_aliases=true&with_meta=true&with_mute_status=true&with_tags=true&api_key='+api_key+'&application_key='+app_key
    }, function(response) {
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {
            // Data reception is done, do whatever with it!
            var parsed = JSON.parse(body);
            for(var i=0; i < parsed.rows.length; i++) {
                row = parsed.rows[i];
                if (row['apps'].indexOf('agent') >= 0 || row['apps'].indexOf('aws') >= 0) {
                    amount_servers += 1;
                }
            }
            sendToDatadog(amount_servers);
        });
    });
}

function sendToDatadog(amount_servers) {
    var options = {
        host: 'app.datadoghq.com',
        path: '/api/v1/series?api_key='+api_key,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }

    now =  Math.floor(Date.now()/1000);
    var postData = JSON.stringify({
        'series':[{
            'metric' : 'datadog.usage',
            'points' : [[now,amount_servers]]
        }]
    });

    var req = https.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
            console.log('No more data in response.');
        });
    });

    req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
    });

    // write data to request body
    req.write(postData);
    console.log(postData);
    req.end();
};
