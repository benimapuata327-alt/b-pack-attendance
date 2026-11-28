
import { useMemo, useState } from 'react';
import {
  FileBarChart,
  Printer,
  FileSpreadsheet,
  Share2,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Field';
import { EmptyState, StatusBadge } from '@/components/ui/Feedback';
import { BarChart } from '@/components/ui/Charts';
import { fmtDateFR, minutesToHuman } from '@/api/businessLogic';
import type { Attendance, Team, Rotation } from '@/types';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'agent' | 'team' | 'shift';

export function ReportsPage() {
  const { user } = useAuth();
  const attendanceQ = useFetch<Attendance[]>(() => api.listAttendance(), []);
  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);
  const rotationsQ = useFetch<Rotation[]>(() => api.listRotations(), []);

  const [type, setType] = useState<ReportType>('daily');
  const [refDate, setRefDate] = useState(new Date().toISOString().slice(0, 10));
  const [teamId, setTeamId] = useState('');
  const [sharing, setSharing] = useState(false);

  const allowedTeamId =
    user?.role === 'SURVEILLANT' && user.teamId ? user.teamId : null;
  const effTeamId = allowedTeamId ?? teamId;

  const records = attendanceQ.data ?? [];

  const filtered = useMemo(() => {
    const ref = new Date(`${refDate}T12:00:00`);

    return records.filter((r) => {
      if (effTeamId && r.teamId !== effTeamId) return false;

      if (type === 'daily') return r.serviceDate === refDate;

      if (type === 'weekly') {
        const start = new Date(ref);
        start.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        const d = new Date(`${r.serviceDate}T12:00:00`);
        return d >= start && d <= end;
      }

      if (type === 'monthly') {
        return r.serviceDate.startsWith(refDate.slice(0, 7));
      }

      return true;
    });
  }, [records, type, refDate, effTeamId]);

  const presentRecords = useMemo(
    () => filtered.filter((r) => r.statut === 'PRESENT'),
    [filtered]
  );

  const summary = useMemo(() => {
    const present = filtered.filter((r) => r.statut === 'PRESENT').length;
    const absent = filtered.filter((r) => r.statut === 'ABSENT').length;
    const late = filtered.filter((r) => r.statut === 'RETARD').length;
    const totalRetard = filtered.reduce((s, r) => s + r.retardMinutes, 0);

    return { present, absent, late, total: filtered.length, totalRetard };
  }, [filtered]);

  const byTeam = useMemo(() => {
    return (teamsQ.data ?? []).map((t) => ({
      label: t.code,
      color: '#F28C28',
      value: filtered.filter((r) => r.teamId === t.id).length,
    }));
  }, [filtered, teamsQ.data]);

  const byShift = useMemo(() => {
    const shifts: { label: string; value: number; color: string }[] = [];

    for (const s of ['MATIN', 'SOIR', 'NUIT'] as const) {
      shifts.push({
        label: s,
        value: filtered.filter((r) => r.shift === s).length,
        color:
          s === 'MATIN'
            ? '#f59e0b'
            : s === 'SOIR'
              ? '#F28C28'
              : '#343A40',
      });
    }

    return shifts;
  }, [filtered]);

  const print = () => window.print();

  const exportCSV = () => {
    const headers = [
      'Matricule',
      'Agent',
      'Équipe',
      'Date',
      'Rotation',
      'Heure',
      'Statut',
      'Retard (min)',
    ];

    const rows = filtered.map((r) => [
      r.agentMatricule,
      r.agentNom,
      r.teamCode,
      r.serviceDate,
      r.shift,
      r.heureArrivee ?? '',
      r.statut,
      r.retardMinutes,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${type}_${refDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Création du PDF contenant uniquement les agents PRESENT.
  const createPresentPDF = () => {
    if (presentRecords.length === 0) {
      window.alert('Aucun agent présent à exporter pour cette sélection.');
      return null;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const fileName = `PEAKING_PLANT_Presents_${refDate}.pdf`;

    // En-tête
    doc.setFillColor(35, 45, 58);
    doc.rect(0, 0, pageWidth, 34, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('PEAKING PLANT', 14, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('CONTIAG MANPOWER', 14, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('LISTE DES AGENTS PRESENTS', pageWidth - 14, 15, {
      align: 'right',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Date de référence : ${fmtDateFR(refDate)}`, pageWidth - 14, 23, {
      align: 'right',
    });

    // Résumé
    doc.setTextColor(45, 55, 65);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nombre total de présents : ${presentRecords.length}`, 14, 44);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 14, 51);

    // Tableau
    const columns = [
      { title: 'MATRICULE', x: 12, width: 30 },
      { title: 'NOM DE L’AGENT', x: 42, width: 65 },
      { title: 'ÉQUIPE', x: 107, width: 32 },
      { title: 'DATE', x: 139, width: 30 },
      { title: 'ROTATION', x: 169, width: 28 },
      { title: 'HEURE', x: 197, width: 18 },
    ];

    let y = 60;
    const rowHeight = 9;

    const drawTableHeader = () => {
      doc.setFillColor(242, 140, 40);
      doc.rect(12, y, pageWidth - 24, rowHeight, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);

      columns.forEach((column) => {
        doc.text(column.title, column.x + 1, y + 6);
      });

      y += rowHeight;
    };

    drawTableHeader();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    presentRecords.forEach((r, index) => {
      if (y + rowHeight > pageHeight - 18) {
        doc.addPage();
        y = 18;
        drawTableHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (index % 2 === 0) {
        doc.setFillColor(245, 247, 249);
        doc.rect(12, y, pageWidth - 24, rowHeight, 'F');
      }

      doc.setTextColor(45, 55, 65);

      const values = [
        r.agentMatricule,
        r.agentNom,
        r.teamCode,
        fmtDateFR(r.serviceDate),
        r.shift,
        r.heureArrivee ?? '—',
      ];

      values.forEach((value, i) => {
        const maxLength = i === 1 ? 35 : 18;
        const cellValue = String(value ?? '—').slice(0, maxLength);
        doc.text(cellValue, columns[i].x + 1, y + 6);
      });

      y += rowHeight;
    });

    // Pied de page
    const totalPages = doc.getNumberOfPages();

    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);
      doc.setDrawColor(220, 225, 230);
      doc.line(12, pageHeight - 12, pageWidth - 12, pageHeight - 12);

      doc.setFontSize(8);
      doc.setTextColor(120, 125, 130);
      doc.text('Document de présence - PEAKING PLANT', 12, pageHeight - 7);
      doc.text(`Page ${page}/${totalPages}`, pageWidth - 12, pageHeight - 7, {
        align: 'right',
      });
    }

    const blob = doc.output('blob');
    return new File([blob], fileName, { type: 'application/pdf' });
  };

  // Téléchargement du PDF.
  const exportPresentPDF = () => {
    const file = createPresentPDF();
    if (!file) return;

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Partage du véritable fichier PDF avec le menu de partage du téléphone.
  const sharePresentPDF = async () => {
    const file = createPresentPDF();
    if (!file) return;

    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
      share?: (data: {
        files?: File[];
        title?: string;
        text?: string;
      }) => Promise<void>;
    };

    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        setSharing(true);
        await nav.share({
          files: [file],
          title: 'Liste des agents présents',
          text: `Liste des agents présents - PEAKING PLANT - ${fmtDateFR(refDate)}`,
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          window.alert(
            'Le partage direct a échoué. Télécharge le PDF et joins-le manuellement dans WhatsApp.'
          );
        }
      } finally {
        setSharing(false);
      }
      return;
    }

    // Solution de secours si le navigateur ne permet pas le partage de fichiers.
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    window.alert(
      'Le PDF a été téléchargé. Ouvre WhatsApp, sélectionne ton destinataire et joins ce fichier.'
    );
  };

  return (
    <div>
      <PageHeader
        title="Rapports"
        subtitle="Analyse statistique et export des pointages"
        icon={<FileBarChart className="w-5 h-5" />}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={exportCSV}
            >
              Excel/CSV
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={exportPresentPDF}
              disabled={presentRecords.length === 0}
            >
              PDF - Présents uniquement
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<Share2 className="w-4 h-4" />}
              onClick={sharePresentPDF}
              disabled={presentRecords.length === 0 || sharing}
            >
              {sharing ? 'Partage...' : 'Partager WhatsApp'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={print}
            >
              Imprimer / PDF
            </Button>
          </>
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as ReportType)}
          >
            <option value="daily">Journalier</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuel</option>
            <option value="agent">Par agent</option>
            <option value="team">Par équipe</option>
            <option value="shift">Par rotation</option>
          </Select>

          <Input
            type="date"
            value={refDate}
            onChange={(e) => setRefDate(e.target.value)}
          />

          {!allowedTeamId && (
            <Select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              <option value="">Toutes équipes</option>
              {(teamsQ.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  TEAM {t.code}
                </option>
              ))}
            </Select>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-3xl font-display font-bold text-green-600">
              {summary.present}
            </p>
            <p className="text-xs text-graphite-400 mt-1">Présents</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-display font-bold text-amber-600">
              {summary.late}
            </p>
            <p className="text-xs text-graphite-400 mt-1">Retards</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-display font-bold text-red-600">
              {summary.absent}
            </p>
            <p className="text-xs text-graphite-400 mt-1">Absents</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-3xl font-display font-bold text-graphite-600">
              {summary.totalRetard > 0
                ? minutesToHuman(summary.totalRetard)
                : '0'}
            </p>
            <p className="text-xs text-graphite-400 mt-1">Retard cumulé</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Par équipe">
          <BarChart data={byTeam} />
        </Card>

        <Card title="Par rotation">
          <BarChart data={byShift} />
        </Card>
      </div>

      <Card
        title="Détail des pointages"
        subtitle={`${filtered.length} enregistrement(s)`}
      >
        {filtered.length === 0 ? (
          <EmptyState
            title="Aucune donnée"
            description="Aucun pointage sur la période sélectionnée."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Agent</th>
                  <th>Équipe</th>
                  <th>Date</th>
                  <th>Rotation</th>
                  <th>Statut</th>
                  <th>Retard</th>
                </tr>
              </thead>

              <tbody>
                {filtered.slice(0, 100).map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-semibold text-brand-600">
                      {r.agentMatricule}
                    </td>
                    <td className="font-medium text-graphite-600">
                      {r.agentNom}
                    </td>
                    <td>{r.teamCode}</td>
                    <td>{fmtDateFR(r.serviceDate)}</td>
                    <td>{r.shift}</td>
                    <td>
                      <StatusBadge statut={r.statut} />
                    </td>
                    <td className="text-amber-600">
                      {r.retardMinutes > 0
                        ? minutesToHuman(r.retardMinutes)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
