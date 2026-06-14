import "@/styles/modal-animations.css";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Footer } from '@/components/layout/footer';
import { Car, Euro, Calendar, ArrowRight, CheckCircle } from 'lucide-react';

const RentMyCarLanding = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const steps = [
    {
      icon: Car,
      title: "Mon véhicule & mes infos",
      description: "Je renseigne les informations de mon véhicule et mes coordonnées.",
      details: ["Informations du véhicule", "Upload carte grise ou saisie manuelle", "Coordonnées personnelles"]
    },
    {
      icon: Euro,
      title: "Mes conditions de location",
      description: "Je définis mes tarifs, mes règles et mes conditions de réservation.",
      details: ["Tarifs journaliers", "Réductions longue durée", "Paramètres de réservation"]
    },
    {
      icon: Calendar,
      title: "Mes disponibilités & mes photos",
      description: "Je choisis les jours où mon véhicule est disponible et j'ajoute mes photos.",
      details: ["Calendrier interactif", "Photos du véhicule", "Vérification d'identité"]
    }
  ];

  const benefits = [
    "Gagnez de l'argent facilement avec votre véhicule",
    "Vous gardez le contrôle total de vos disponibilités",
    "Assurance incluse pour tous vos locataires",
    "Support client 7j/7 pour vous accompagner"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Seo
        title={t("seo.rentMyCar.title")}
        description={t("seo.rentMyCar.description")}
        canonical="https://rentanoo.com/rent-my-car"
      />
      <main className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-lagoon bg-clip-text text-transparent animate-fade-in">
            Proposez votre véhicule ou hébergement à Nosy Be
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '200ms' }}>
            Un processus rapide en 3 étapes pour mettre votre véhicule en location sur Rentanoo et commencer à gagner de l'argent dès aujourd'hui.
          </p>
          
          {/* CTA Principal */}
          <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
            <Button 
              size="lg"
              className="bg-gradient-lagoon hover:opacity-90 text-white font-semibold px-8 py-4 text-lg shadow-lagoon hover-scale group relative overflow-hidden"
              onClick={() => navigate('/rent-my-car/register')}
            >
              <span className="relative z-10">Je commence l'inscription de mon véhicule</span>
              <ArrowRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
            </Button>
          </div>
        </div>

        {/* Process Steps */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const gradientColors = [
                'from-blue-500/10 via-cyan-500/10 to-teal-500/10 border-blue-200/50',
                'from-emerald-500/10 via-green-500/10 to-lime-500/10 border-emerald-200/50', 
                'from-purple-500/10 via-violet-500/10 to-indigo-500/10 border-purple-200/50'
              ];
              const iconBgColors = [
                'bg-gradient-to-br from-blue-500 to-cyan-500',
                'bg-gradient-to-br from-emerald-500 to-green-500',
                'bg-gradient-to-br from-purple-500 to-violet-500'
              ];
              const iconColors = [
                'text-blue-600',
                'text-emerald-600', 
                'text-purple-600'
              ];
              
              return (
                <Card 
                  key={index} 
                  className={`relative overflow-hidden border-2 bg-gradient-to-br ${gradientColors[index]} hover:shadow-xl hover:shadow-primary/20 transition-all duration-500 group animate-fade-in hover-scale cursor-pointer`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <CardContent className="p-8 text-center relative">
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Step Number */}
                    <div className={`absolute top-4 left-4 w-10 h-10 ${iconBgColors[index]} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {index + 1}
                    </div>
                    
                    {/* Icon */}
                    <div className="relative w-20 h-20 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg">
                      <Icon className={`h-10 w-10 ${iconColors[index]} group-hover:scale-110 transition-transform duration-300`} />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">{step.title}</h3>
                    <p className="text-muted-foreground mb-6 group-hover:text-foreground/80 transition-colors duration-300">{step.description}</p>
                    
                    {/* Details */}
                    <ul className="text-sm text-left space-y-3">
                      {step.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                          <div className={`w-5 h-5 ${iconBgColors[index]} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <CheckCircle className="h-3 w-3 text-white" />
                          </div>
                          <span className="font-medium">{detail}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Animated border effect */}
                    <div className="absolute inset-0 rounded-lg bg-gradient-lagoon opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl p-8 md:p-12 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Pourquoi choisir Rentanoo ?</h2>
            <p className="text-muted-foreground text-lg">Rejoignez les propriétaires qui font confiance à notre plateforme</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-lagoon rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center animate-fade-in">
          <h3 className="text-2xl font-semibold mb-4">Prêt à commencer ?</h3>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            L'inscription ne prend que quelques minutes. Commencez dès maintenant et mettez votre véhicule en location.
          </p>
          
          <div className="animate-scale-in" style={{ animationDelay: '300ms' }}>
            <Button 
              size="lg"
              className="bg-gradient-lagoon hover:opacity-90 text-white font-semibold px-8 py-4 text-lg shadow-lagoon hover-scale group relative overflow-hidden"
              onClick={() => navigate('/rent-my-car/register')}
            >
              <span className="relative z-10">Je commence l'inscription de mon véhicule</span>
              <ArrowRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RentMyCarLanding;