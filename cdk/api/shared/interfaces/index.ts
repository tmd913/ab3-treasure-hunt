export interface CustomAuthorizerContext {
  uuid: string;
  email: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface CreateHuntBody {
  playerID: string;
  playerEmail: string;
  treasureImage: string;
  treasureDescription: string;
  treasureLocation: Location;
  triggerDistance: number;
}
