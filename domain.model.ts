import mongoose from "mongoose"

export interface Domain{
    host:string;
    subdomain: string;

}
const domainSchema = new mongoose.Schema<Domain>({
  host: {
    type: String,
    required: true
  },
  subdomain: {
    type: String,
    required: true
  }
});

export const Domain = mongoose.model<Domain>('Domain', domainSchema);


