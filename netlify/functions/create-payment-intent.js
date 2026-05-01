const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Prix en centimes (correspond aux plan-card data-price du frontend)
const PRIX = {
  'Essentiel': 1490,  // 14,90 €
  'Complet':   3990,  // 39,90 €
  'Intégral':  7900,  // 79,00 €
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { formule, email, nom, entreprise, nom_candidat } = body;

    const amount = PRIX[formule];
    if (!amount) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Formule inconnue : ' + formule }),
      };
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      receipt_email: email || undefined,
      description: `CVérifié · Formule ${formule}`,
      metadata: {
        formule:       formule       || '',
        nom_recruteur: nom           || '',
        entreprise:    entreprise    || '',
        nom_candidat:  nom_candidat  || '',
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientSecret: intent.client_secret }),
    };
  } catch (err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Erreur serveur. Veuillez réessayer.' }),
    };
  }
};
