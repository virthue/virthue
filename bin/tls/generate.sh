#!/bin/bash
mac="AABBCCDDEEFF0011"
config=./certs
dec_serial=$(perl -e "print hex('$mac')")

echo "MAC (hex): $mac"
echo "Serial (dec): $dec_serial"
echo "Creating certificate..."

# OHNE -config Parameter
faketime '2017-01-01 00:00:00' openssl req -new -days 7670 -nodes -x509 \
    -newkey ec -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:named_curve \
    -subj "/C=NL/O=Philips Hue/CN=$mac" \
    -keyout private.key \
    -out public.crt \
    -set_serial $dec_serial

# Prüfe ob Zertifikat erstellt wurde
if [ ! -f private.key ] || [ ! -f public.crt ]; then
    echo "ERROR: Certificate creation failed!"
    exit 1
fi

# Verzeichnis erstellen
mkdir -p "$config"

# Kombiniere Key + Cert
cat private.key > "$config/cert.pem"
cat public.crt >> "$config/cert.pem"

# Aufräumen
rm private.key public.crt

echo "Certificate created: $config/cert.pem"