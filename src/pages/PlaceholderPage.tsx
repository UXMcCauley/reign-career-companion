import { IonContent, IonHeader, IonPage, IonText, IonTitle, IonToolbar } from '@ionic/react';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, subtitle }) => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h2>{title}</h2>
        <IonText color="medium">
          <p>{subtitle}</p>
        </IonText>
      </IonContent>
    </IonPage>
  );
};

export default PlaceholderPage;
