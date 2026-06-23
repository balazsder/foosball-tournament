import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Match, StandingRow, Tournament } from '../types'
import { derive } from '../state/selectors'
import { ROUND_TITLES } from './knockout'
import { winnerOf } from './standings'

const BRAND: [number, number, number] = [0x79, 0x23, 0x3a]
const PITCH: [number, number, number] = [0x1f, 0x8a, 0x45]

/**
 * jsPDF's built-in Helvetica uses WinAnsi encoding, which lacks the Hungarian
 * double-acute letters ő/ű. Fall back to single-acute so PDFs stay readable.
 */
function pdf(text: string): string {
  return text
    .replace(/ő/g, 'ö')
    .replace(/Ő/g, 'Ö')
    .replace(/ű/g, 'ü')
    .replace(/Ű/g, 'Ü')
}

function teamLabel(t: Tournament, id: string | null): string {
  if (!id) return '—'
  const team = t.teams.find((x) => x.id === id)
  return team ? team.name : '—'
}

function header(doc: jsPDF, title: string, subtitle: string) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, w, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(pdf(title), 14, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(pdf(subtitle), 14, 19)
  doc.setFontSize(8)
  doc.text('E-Group ICT Software Zrt.', w - 14, 12, { align: 'right' })
  doc.text(new Date().toLocaleString('hu-HU'), w - 14, 19, { align: 'right' })
  doc.setTextColor(15, 23, 42)
}

const STANDINGS_HEAD = [['#', 'Csapat', 'M', 'Gy', 'V', 'LG', 'KG', 'GK', 'P']]

function standingsRows(t: Tournament, rows: StandingRow[]) {
  return rows.map((r) => [
    String(r.rank),
    pdf(teamLabel(t, r.teamId)),
    String(r.played),
    String(r.wins),
    String(r.losses),
    String(r.goalsFor),
    String(r.goalsAgainst),
    (r.goalDiff > 0 ? '+' : '') + r.goalDiff,
    String(r.points),
  ])
}

/** PDF: group standings tables (versenytábla). */
export function exportStandingsPDF(t: Tournament) {
  const d = derive(t)
  const doc = new jsPDF()
  header(doc, t.name, 'Csoportkör állása · Tabella')
  let y = 34

  t.groups.forEach((g) => {
    const rows = d.standingsByGroup.get(g.id) ?? []
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(pdf(`${g.name} csoport`), 14, y)
    y += 2
    autoTable(doc, {
      startY: y + 2,
      head: STANDINGS_HEAD,
      body: standingsRows(t, rows),
      theme: 'grid',
      headStyles: { fillColor: PITCH, halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center', fontStyle: 'bold' },
      },
      // highlight qualifiers in green
      didParseCell: (data) => {
        if (data.section === 'body') {
          const row = rows[data.row.index]
          if (row?.qualified) data.cell.styles.fillColor = [220, 245, 228]
        }
      },
      styles: { fontSize: 9, cellPadding: 2 },
    })
    // @ts-expect-error lastAutoTable is added by the plugin
    y = doc.lastAutoTable.finalY + 12
    if (y > 250) {
      doc.addPage()
      y = 20
    }
  })

  doc.save(`${slug(t.name)}-tabella.pdf`)
}

/** PDF: final results — podium, knockout results and final standings. */
export function exportResultsPDF(t: Tournament) {
  const d = derive(t)
  const doc = new jsPDF()
  header(doc, t.name, 'Végeredmény')
  let y = 34

  // Podium from knockout, if available
  const final = t.matches.find((m) => m.round === 'FINAL' && m.played)
  const bronze = t.matches.find((m) => m.round === 'BRONZE' && m.played)
  if (final) {
    const champ = winnerOf(final)
    const runnerUp = champ === final.teamA ? final.teamB : final.teamA
    const third = bronze ? winnerOf(bronze) : null
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('Dobogó', 14, y)
    y += 2
    autoTable(doc, {
      startY: y + 2,
      head: [['Helyezés', 'Csapat']],
      body: [
        ['1. 🥇', pdf(teamLabel(t, champ))],
        ['2. 🥈', pdf(teamLabel(t, runnerUp))],
        ...(third ? [['3. 🥉', pdf(teamLabel(t, third))]] : []),
      ],
      theme: 'grid',
      headStyles: { fillColor: BRAND },
      styles: { fontSize: 11, cellPadding: 3 },
    })
    // @ts-expect-error plugin field
    y = doc.lastAutoTable.finalY + 10
  }

  // Knockout results
  const ko = t.matches
    .filter((m) => m.stage === 'knockout' && !m.isBye)
    .sort((a, b) => a.order - b.order)
  if (ko.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('Kieséses szakasz', 14, y)
    autoTable(doc, {
      startY: y + 4,
      head: [['Forduló', 'Mérkőzés', 'Eredmény']],
      body: ko.map((m) => [
        pdf(ROUND_TITLES[m.round!]),
        pdf(`${teamLabel(t, m.teamA)} – ${teamLabel(t, m.teamB)}`),
        m.played && m.scoreA !== null ? `${m.scoreA} : ${m.scoreB}` : '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: PITCH },
      styles: { fontSize: 10, cellPadding: 2.5 },
    })
    // @ts-expect-error plugin field
    y = doc.lastAutoTable.finalY + 10
  }

  if (y > 240) {
    doc.addPage()
    y = 20
  }

  // Final group standings
  t.groups.forEach((g) => {
    const rows = d.standingsByGroup.get(g.id) ?? []
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(pdf(`${g.name} csoport — végállás`), 14, y)
    autoTable(doc, {
      startY: y + 4,
      head: STANDINGS_HEAD,
      body: standingsRows(t, rows),
      theme: 'grid',
      headStyles: { fillColor: PITCH, halign: 'center' },
      styles: { fontSize: 9, cellPadding: 2 },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const row = rows[data.row.index]
          if (row?.qualified) data.cell.styles.fillColor = [220, 245, 228]
        }
      },
    })
    // @ts-expect-error plugin field
    y = doc.lastAutoTable.finalY + 10
    if (y > 250) {
      doc.addPage()
      y = 20
    }
  })

  doc.save(`${slug(t.name)}-vegeredmeny.pdf`)
}

/** Excel workbook: standings sheet per group, plus matches and qualifiers. */
export function exportExcel(t: Tournament) {
  const d = derive(t)
  const wb = XLSX.utils.book_new()

  t.groups.forEach((g) => {
    const rows = d.standingsByGroup.get(g.id) ?? []
    const aoa = [
      ['Helyezés', 'Csapat', 'M', 'Gy', 'V', 'LG', 'KG', 'GK', 'P', 'Továbbjut'],
      ...rows.map((r) => [
        r.rank,
        teamLabel(t, r.teamId),
        r.played,
        r.wins,
        r.losses,
        r.goalsFor,
        r.goalsAgainst,
        r.goalDiff,
        r.points,
        r.qualified ? 'IGEN' : '',
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [{ wch: 8 }, { wch: 22 }, ...Array(7).fill({ wch: 5 }), { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws, `${g.name} csoport`.slice(0, 31))
  })

  // Matches sheet
  const matchRows = [...t.matches]
    .sort((a, b) => a.order - b.order)
    .map((m) => [
      m.order,
      m.stage === 'group'
        ? `${groupNameOf(t, m)} csoport${m.leg === 2 ? ' (visszavágó)' : ''}`
        : ROUND_TITLES[m.round!],
      teamLabel(t, m.teamA),
      teamLabel(t, m.teamB),
      m.played && m.scoreA !== null ? m.scoreA : '',
      m.played && m.scoreB !== null ? m.scoreB : '',
      m.played ? teamLabel(t, winnerOf(m)) : '',
    ])
  const wsM = XLSX.utils.aoa_to_sheet([
    ['#', 'Szakasz', 'Csapat A', 'Csapat B', 'Gól A', 'Gól B', 'Győztes'],
    ...matchRows,
  ])
  wsM['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 6 }, { wch: 6 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsM, 'Mérkőzések')

  // Teams sheet
  const wsT = XLSX.utils.aoa_to_sheet([
    ['Csapat', 'Játékos 1', 'Játékos 2', 'Csoport'],
    ...t.teams.map((tm) => [
      tm.name,
      tm.players[0],
      tm.players[1],
      groupLabelById(t, tm.groupId),
    ]),
  ])
  wsT['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsT, 'Csapatok')

  XLSX.writeFile(wb, `${slug(t.name)}.xlsx`)
}

function groupNameOf(t: Tournament, m: Match): string {
  return t.groups.find((g) => g.id === m.groupId)?.name ?? '?'
}
function groupLabelById(t: Tournament, id: string): string {
  return t.groups.find((g) => g.id === id)?.name ?? '?'
}
function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'csocso'
  )
}
