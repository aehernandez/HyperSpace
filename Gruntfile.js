module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        connect: {
            web_server: {
                options: {
                    port: 8080,
                    base: 'www',
                    keepalive: true
                }
            }
        },
        bgShell: {
            _defaults: {
                stdout: true,
                stderr: true,
            },
            simple_server: {
                stdout: true,
                fail: true,
                cmd: "python3 ./src/python/simple_server.py"
            }
        }
    });

    grunt.loadNpmTasks('grunt-bg-shell');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.registerTask('default', ['bgShell:simple_server', 'connect:web_server']);
};
