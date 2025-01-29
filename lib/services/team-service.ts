import { parseCSV } from '@/lib/utils/csv-parser';

/**
 * Recupera i dati delle statistiche per una squadra specifica.
 * Calcola la media delle squadre vicine in classifica.
 */
export async function getTeamStats(
  team: string,
  league: string,
  dataSource: 'team' | 'opponent' = 'team'
) {
  try {
    // Carica dati della lega
    const leagueFile = league.toLowerCase().replace(/\s+/g, '_');
    const leagueDataResponse = await fetch(`/Bet_Website/data/standings/${leagueFile}.csv`);
    const leagueDataCSV = await leagueDataResponse.text();
    const leagueData = await parseCSV<any>(leagueDataCSV);

    // Trova la posizione della squadra
    const teamLeagueStats = leagueData.find((row: any) => row.Squadra === team);

    if (!teamLeagueStats) {
      // Return null or a default value instead of throwing an error
      return {
        goalsFor: 0,
        goalsAgainst: 0,
        xG: 0,
        xAG: 0,
        foulsCommitted: 0,
        foulsSuffered: 0,
        offside: 0,
        yellowCards: 0,
        played: 0,
        perMatchGoalsFor: 0,
        perMatchGoalsAgainst: 0,
        perMatchXG: 0,
        perMatchXAG: 0,
        perMatchFoulsCommitted: 0,
        perMatchFoulsSuffered: 0,
        perMatchOffside: 0,
        perMatchYellowCards: 0,
        leagueAverage: {
          total: {
            'Reti Fatte': 0,
            'Reti Subite': 0,
            xG: 0,
            xAG: 0,
            'Falli Comessi': 0,
            'Falli Subiti': 0,
            Fuorigioco: 0,
            'Ammonizioni': 0,
          },
          perMatch: {
            'Reti Fatte': 0,
            'Reti Subite': 0,
            xG: 0,
            xAG: 0,
            'Falli Comessi': 0,
            'Falli Subiti': 0,
            Fuorigioco: 0,
            'Ammonizioni': 0,
          },
        },
      };
    }

    const teamPosition = parseInt(teamLeagueStats.Pos, 10);

    // Determina il range di posizioni per il calcolo della media
    let startPos = Math.max(teamPosition - 3, 1);
    let endPos = teamPosition + 3;

    // Se la squadra è nelle prime 3 posizioni, aggiusta il range
    if (teamPosition <= 3) {
      startPos = 1;
      endPos = 6;
    }

    // Se la squadra è nelle ultime 3 posizioni, aggiusta il range
    const totalTeams = leagueData.length;
    if (teamPosition >= totalTeams - 2) {
      endPos = totalTeams;
      startPos = totalTeams - 5;
    }

    // Filtra le squadre nel range di posizioni
    const nearbyTeams = leagueData.filter((row: any) => {
      const pos = parseInt(row.Pos, 10);
      return pos >= startPos && pos <= endPos;
    });

    // Decide quale dataset utilizzare
    let dataFile = '';
    const normalizedLeague = league.trim().toLowerCase();

    if (normalizedLeague === 'champions league') {
      if (dataSource === 'team') {
        dataFile = '/public/data/champions_casa.csv';
      } else if (dataSource === 'opponent') {
        dataFile = '/public/data/champions_avversari.csv';
      } else {
        throw new Error(`Data source ${dataSource} is not recognized.`);
      }
    } else {
      if (dataSource === 'team') {
        dataFile = '/Bet_Website/data/team_performance.csv';
      } else if (dataSource === 'opponent') {
        dataFile = '/Bet_Website/data/opponent_performance.csv';
      } else {
        throw new Error(`Data source ${dataSource} is not recognized.`);
      }
    }

    // Carica dati dal file appropriato
    const dataResponse = await fetch(dataFile);
    const dataCSV = await dataResponse.text();
    const data = await parseCSV<any>(dataCSV);

    const teamDataStats = data.find((row: any) => row.Squadra === team);

    if (!teamDataStats) {
      return {
        goalsFor: 0,
        goalsAgainst: 0,
        xG: 0,
        xAG: 0,
        foulsCommitted: 0,
        foulsSuffered: 0,
        offside: 0,
        yellowCards: 0,
        played: 0,
        perMatchGoalsFor: 0,
        perMatchGoalsAgainst: 0,
        perMatchXG: 0,
        perMatchXAG: 0,
        perMatchFoulsCommitted: 0,
        perMatchFoulsSuffered: 0,
        perMatchOffside: 0,
        perMatchYellowCards: 0,
        leagueAverage: {
          total: {
            'Reti Fatte': 0,
            'Reti Subite': 0,
            xG: 0,
            xAG: 0,
            'Falli Comessi': 0,
            'Falli Subiti': 0,
            Fuorigioco: 0,
            'Ammonizioni': 0,
          },
          perMatch: {
            'Reti Fatte': 0,
            'Reti Subite': 0,
            xG: 0,
            xAG: 0,
            'Falli Comessi': 0,
            'Falli Subiti': 0,
            'Fuorigioco': 0,
            'Ammonizioni': 0,
          },
        },
      };
    }

    // Calcola statistiche per la squadra
    const played = parseInt(teamLeagueStats.PG, 10);

    // Inverti Rf e Rs se dataSource è 'opponent'
    const goalsFor =
      dataSource === 'team'
        ? parseInt(teamLeagueStats.Rf, 10)
        : parseInt(teamLeagueStats.Rs, 10);
    const goalsAgainst =
      dataSource === 'team'
        ? parseInt(teamLeagueStats.Rs, 10)
        : parseInt(teamLeagueStats.Rf, 10);

    const stats = {
      goalsFor: goalsFor,
      goalsAgainst: goalsAgainst,
      xG: parseFloat(teamDataStats.xG),
      xAG: parseFloat(teamDataStats.xAG),
      foulsCommitted: parseInt(teamDataStats['Falli commessi'], 10),
      foulsSuffered: parseInt(teamDataStats['Falli subiti'], 10),
      offside: parseInt(teamDataStats['Fuorigioco'], 10),
      yellowCards: parseInt(teamDataStats['Amm.'], 10),
    };

    // Calcola medie delle squadre vicine
    const totalNearbyTeams = nearbyTeams.length;

    const avgGoalsFor =
      nearbyTeams.reduce((sum: number, t: any) => {
        return sum + (dataSource === 'team' ? parseInt(t.Rf, 10) : parseInt(t.Rs, 10));
      }, 0) / totalNearbyTeams;

    const avgGoalsAgainst =
      nearbyTeams.reduce((sum: number, t: any) => {
        return sum + (dataSource === 'team' ? parseInt(t.Rs, 10) : parseInt(t.Rf, 10));
      }, 0) / totalNearbyTeams;

    const nearbyTeamsDataStats = data.filter((row: any) =>
      nearbyTeams.some((team) => team.Squadra === row.Squadra)
    );

    const avgXG =
      nearbyTeamsDataStats.reduce((sum: number, t: any) => sum + parseFloat(t.xG), 0) /
      totalNearbyTeams;
    const avgXAG =
      nearbyTeamsDataStats.reduce((sum: number, t: any) => sum + parseFloat(t.xAG), 0) /
      totalNearbyTeams;

    const avgFoulsCommitted =
      nearbyTeamsDataStats.reduce(
        (sum: number, t: any) => sum + parseInt(t['Falli commessi'], 10),
        0
      ) / totalNearbyTeams;
    const avgFoulsSuffered =
      nearbyTeamsDataStats.reduce(
        (sum: number, t: any) => sum + parseInt(t['Falli subiti'], 10),
        0
      ) / totalNearbyTeams;
    const avgOffside =
      nearbyTeamsDataStats.reduce((sum: number, t: any) => sum + parseInt(t['Fuorigioco'], 10), 0) /
      totalNearbyTeams;
    const avgYellowCards =
      nearbyTeamsDataStats.reduce(
        (sum: number, t: any) => sum + parseInt(t['Amm.'], 10),
        0
      ) / totalNearbyTeams;

    // Calcola medie per partita
    const avgPerMatchGoalsFor =
      nearbyTeams.reduce(
        (sum: number, t: any) =>
          sum + (dataSource === 'team' ? parseInt(t.Rf, 10) / parseInt(t.PG, 10) : parseInt(t.Rs, 10) / parseInt(t.PG, 10)),
        0
      ) / totalNearbyTeams;
    const avgPerMatchGoalsAgainst =
      nearbyTeams.reduce(
        (sum: number, t: any) =>
          sum + (dataSource === 'team' ? parseInt(t.Rs, 10) / parseInt(t.PG, 10) : parseInt(t.Rf, 10) / parseInt(t.PG, 10)),
        0
      ) / totalNearbyTeams;

    const avgPerMatchXG =
      nearbyTeamsDataStats.reduce(
        (sum: number, t: any) => sum + parseFloat(t.xG) / parseInt(t.PG, 10),
        0
      ) / totalNearbyTeams;
    const avgPerMatchXAG =
      nearbyTeamsDataStats.reduce(
        (sum: number, t: any) => sum + parseFloat(t.xAG) / parseInt(t.PG, 10),
        0
      ) / totalNearbyTeams;

    const avgPerMatchFoulsCommitted =
      nearbyTeamsDataStats.reduce(
        (sum: number, t: any) => sum + parseInt(t['Falli commessi'], 10) / parseInt(t.PG, 10),
        0
      ) / totalNearbyTeams;
    const avgPerMatchFoulsSuffered =
      nearbyTeamsDataStats.reduce(
        (sum: number, t: any) => sum + parseInt(t['Falli subiti'], 10) / parseInt(t.PG, 10),
        0
      ) / totalNearbyTeams;
    const avgPerMatchOffside =
      nearbyTeamsDataStats.reduce(
        (sum: number, t: any) => sum + parseInt(t['Fuorigioco'], 10) / parseInt(t.PG, 10),
        0
      ) / totalNearbyTeams;
    const avgPerMatchYellowCards =
      nearbyTeamsDataStats.reduce(
        (sum: number, t: any) => sum + parseInt(t['Amm.'], 10) / parseInt(t.PG, 10),
        0
      ) / totalNearbyTeams;

    // Include medie di lega regolate
    return {
      ...stats,
      played,
      perMatchGoalsFor: stats.goalsFor / played,
      perMatchGoalsAgainst: stats.goalsAgainst / played,
      perMatchXG: stats.xG / played,
      perMatchXAG: stats.xAG / played,
      perMatchFoulsCommitted: stats.foulsCommitted / played,
      perMatchFoulsSuffered: stats.foulsSuffered / played,
      perMatchOffside: stats.offside / played,
      perMatchYellowCards: stats.yellowCards / played,
      leagueAverage: {
        total: {
          'Reti Fatte': avgGoalsFor,
          'Reti Subite': avgGoalsAgainst,
          xG: avgXG,
          xAG: avgXAG,
          'Falli Comessi': avgFoulsCommitted,
          'Falli Subiti': avgFoulsSuffered,
          Fuorigioco: avgOffside,
          'Ammonizioni': avgYellowCards,
        },
        perMatch: {
          'Reti Fatte': avgPerMatchGoalsFor,
          'Reti Subite': avgPerMatchGoalsAgainst,
          xG: avgPerMatchXG,
          xAG: avgPerMatchXAG,
          'Falli Comessi': avgPerMatchFoulsCommitted,
          'Falli Subiti': avgPerMatchFoulsSuffered,
          Fuorigioco: avgPerMatchOffside,
          'Ammonizioni': avgPerMatchYellowCards,
        },
      },
    };
  } catch (error) {
    console.error('Errore durante il calcolo delle statistiche:', error);
    throw error;
  }
}
