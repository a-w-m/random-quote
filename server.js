"use strict";

/*import http, file system and path modules*/
var http = require("http");
var fs = require("fs");
var path =require("path");


// initiate new server object
http.createServer(function (request, response) {
    console.log(request.url);

    var fileName = request.url == "/" ? __dirname + "/index.html" : __dirname + request.url;


    var fileExt = String(path.extname(fileName)).toLowerCase();

    var validExt ={
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css'
    };

    var contentType = validExt[fileExt];
    console.log(contentType)

    //respond to invalid mime type
    if (contentType == undefined){

        console.log("invalid file type");
        response.writeHead(404);
        response.end("File Not Found")

    }
    //logic to read the file on the server and send to client
    else {
    
        fs.readFile(fileName, function(error, data){

            if(error){
                throw error
                console.log("File Not Found");
                response.writeHead(404);
                response.end("File Not Found");
            }
            else{
                console.log("sending" + fileExt + "...")
                response.writeHead(200, {"Content-Type": contentType});
                response.end(data, "utf-8");

            }

        });
    }

}).listen(8080);

