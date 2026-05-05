// EMV BR Code (Pix copia-e-cola) generator
function tlv(id: string, value: string) {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const sanitize = (s: string, max: number) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").slice(0, max);

export function generatePixPayload(opts: {
  key: string;
  name: string;
  city: string;
  amount: number;
  txid?: string;
}) {
  const { key, name, city, amount, txid = "***" } = opts;
  const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", key);
  const payload =
    tlv("00", "01") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", amount.toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", sanitize(name, 25)) +
    tlv("60", sanitize(city, 15)) +
    tlv("62", tlv("05", sanitize(txid, 25)));
  const toCrc = payload + "6304";
  return toCrc + crc16(toCrc);
}
