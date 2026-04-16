const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const tanggalWaktuFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const labelStatusLelang = {
  DRAFT: 'Draft',
  ACTIVE: 'Aktif',
  EXTENDED: 'Diperpanjang',
  CLOSED: 'Ditutup',
  WON: 'Menang',
  UNSOLD: 'Tidak Terjual',
}

export const formatRupiah = (nilai) => {
  if (nilai === null || nilai === undefined || Number.isNaN(Number(nilai))) {
    return '-'
  }

  return rupiahFormatter.format(Number(nilai))
}

export const formatTanggalWaktu = (nilai) => {
  if (!nilai) {
    return '-'
  }

  return tanggalWaktuFormatter.format(new Date(nilai))
}

export const formatHitungMundur = (berakhirPada, sekarang = Date.now()) => {
  if (!berakhirPada) {
    return 'Belum dijadwalkan'
  }

  const selisih = new Date(berakhirPada).getTime() - sekarang
  if (selisih <= 0) {
    return 'Waktu habis'
  }

  const totalDetik = Math.floor(selisih / 1000)
  const hari = Math.floor(totalDetik / 86400)
  const jam = Math.floor((totalDetik % 86400) / 3600)
  const menit = Math.floor((totalDetik % 3600) / 60)
  const detik = totalDetik % 60

  if (hari > 0) {
    return `${hari}h ${jam}j ${menit}m`
  }

  if (jam > 0) {
    return `${jam}j ${menit}m ${detik}d`
  }

  return `${menit}m ${detik}d`
}

export const formatWaktuRelatif = (waktu, sekarang = Date.now()) => {
  if (!waktu) {
    return '-'
  }

  const selisihDetik = Math.floor((sekarang - new Date(waktu).getTime()) / 1000)
  if (selisihDetik < 0) {
    return 'Baru saja'
  }

  if (selisihDetik < 60) {
    return `${selisihDetik} detik lalu`
  }

  const selisihMenit = Math.floor(selisihDetik / 60)
  if (selisihMenit < 60) {
    return `${selisihMenit} menit lalu`
  }

  const selisihJam = Math.floor(selisihMenit / 60)
  if (selisihJam < 24) {
    return `${selisihJam} jam lalu`
  }

  const selisihHari = Math.floor(selisihJam / 24)
  return `${selisihHari} hari lalu`
}

export const getStatusLelangLabel = (status) => {
  return labelStatusLelang[status] || status || 'Tidak diketahui'
}

export const isStatusBukaUntukBid = (status) => {
  return status === 'ACTIVE' || status === 'EXTENDED'
}

export const getStatusTabKey = (status) => {
  if (status === 'WON' || status === 'UNSOLD' || status === 'CLOSED') {
    return 'CLOSED'
  }

  return status
}
