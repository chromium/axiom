openssl genrsa -out key.pem 1024
openssl req -new -key key.pem -out certrequest.csr
openssl x509 -req -in certrequest.csr -signkey key.pem -out cert.pem

# openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout ~/.ssh/dev_server_key.pem -out ~/.ssh/dev_server_cert.pem
