
import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RegistrationABI } from '@/contracts/Registration';
import { ShipmentTokenABI } from '@/contracts/ShipmentToken';
import { OracleManagerABI } from '@/contracts/OracleManager';
import { EscrowPaymentABI } from '@/contracts/EscrowPayment';
import { DisputeManagerABI } from '@/contracts/DisputeManager';
import { contractAddresses } from '@/contracts/addresses';

// Helper to display results
const ResultDisplay = ({ data }: { data: any }) => {
    if (data === null || data === undefined) return null;
    return (
        <pre className="mt-4 p-4 bg-gray-100 rounded-md">
            {JSON.stringify(data, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value, 2)}
        </pre>
    )
};


export default function ContractStateViewer() {
    const [address, setAddress] = useState('');
  const [role, setRole] = useState('0');
    const [shipmentId, setShipmentId] = useState('');
    const [disputeId, setDisputeId] = useState('');
    const [oracleAddress, setOracleAddress] = useState('');
    const [index, setIndex] = useState('0');
    const [payload, setPayload] = useState('');
    const [signature, setSignature] = useState('');
    const [hash, setHash] = useState('');
    const [lastResult, setLastResult] = useState<any>(null);

    // A generic hook for reading data
    const useContractRead = (abi: any, address: `0x${string}`, functionName: string, args: any[]) => {
        const { data, refetch, isFetching } = useReadContract({
            abi,
            address,
            functionName,
            args,
            query: {
                enabled: false, // Prevent automatic fetching
            },
        });

        const read = async () => {
            const result = await refetch();
            setLastResult(result.data);
        };
        return { read, isFetching };
    };

    // --- Registration ---
    const { read: getParticipantFull, isFetching: isFetchingParticipant } = useContractRead(RegistrationABI, contractAddresses.Registration, 'getParticipantFull', [address]);
    const { read: hasRole, isFetching: isFetchingHasRole } = useContractRead(RegistrationABI, contractAddresses.Registration, 'hasRole', [address, parseInt(role)]);
    const { read: isKycVerified, isFetching: isFetchingKycVerified } = useContractRead(RegistrationABI, contractAddresses.Registration, 'isKycVerified', [address]);
    const { read: kycStatus, isFetching: isFetchingKycStatus } = useContractRead(RegistrationABI, contractAddresses.Registration, 'kycStatus', [address]);

    // --- ShipmentToken ---
    const { read: getFarmerShipments, isFetching: isFetchingFarmerShipments } = useContractRead(ShipmentTokenABI, contractAddresses.ShipmentToken, 'getFarmerShipments', [address]);
    const { read: getTransporterShipments, isFetching: isFetchingTransporterShipments } = useContractRead(ShipmentTokenABI, contractAddresses.ShipmentToken, 'getTransporterShipments', [address]);
    const { read: getIndustryShipments, isFetching: isFetchingIndustryShipments } = useContractRead(ShipmentTokenABI, contractAddresses.ShipmentToken, 'getIndustryShipments', [address]);
    const { read: getShipment, isFetching: isFetchingShipment } = useContractRead(ShipmentTokenABI, contractAddresses.ShipmentToken, 'getShipment', [shipmentId || "0x0"]);
    const { read: getWeighmentCount, isFetching: isFetchingWeighmentCount } = useContractRead(ShipmentTokenABI, contractAddresses.ShipmentToken, 'getWeighmentCount', [shipmentId || "0x0"]);
    const { read: getWeighments, isFetching: isFetchingWeighments } = useContractRead(ShipmentTokenABI, contractAddresses.ShipmentToken, 'getWeighments', [shipmentId || "0x0"]);
    const { read: getLastWeighment, isFetching: isFetchingLastWeighment } = useContractRead(ShipmentTokenABI, contractAddresses.ShipmentToken, 'getLastWeighment', [shipmentId || "0x0"]);
    const { read: isShipmentVerified, isFetching: isFetchingShipmentVerified } = useContractRead(ShipmentTokenABI, contractAddresses.ShipmentToken, 'isShipmentVerified', [shipmentId || "0x0"]);

    // --- OracleManager ---
    const { read: getOracle, isFetching: isFetchingOracle } = useContractRead(OracleManagerABI, contractAddresses.OracleManager, 'getOracle', [oracleAddress]);
    const { read: isOracle, isFetching: isFetchingIsOracle } = useContractRead(OracleManagerABI, contractAddresses.OracleManager, 'isOracle', [oracleAddress]);
    const { read: oracleCount, isFetching: isFetchingOracleCount } = useContractRead(OracleManagerABI, contractAddresses.OracleManager, 'oracleCount', []);
    const { read: oracleAtIndex, isFetching: isFetchingOracleAtIndex } = useContractRead(OracleManagerABI, contractAddresses.OracleManager, 'oracleAtIndex', [parseInt(index)]);
    const { read: verifySignedPayload, isFetching: isFetchingVerifySignedPayload } = useContractRead(OracleManagerABI, contractAddresses.OracleManager, 'verifySignedPayload', [payload, signature]);
    const { read: verifySignedHash, isFetching: isFetchingVerifySignedHash } = useContractRead(OracleManagerABI, contractAddresses.OracleManager, 'verifySignedHash', [hash, signature]);

    // --- EscrowPayment ---
    const { read: getEscrow, isFetching: isFetchingEscrow } = useContractRead(EscrowPaymentABI, contractAddresses.EscrowPayment, 'getEscrow', [shipmentId || "0x0"]);

    // --- DisputeManager ---
    const { read: isAuthorizedManager, isFetching: isFetchingAuthorizedManager } = useContractRead(DisputeManagerABI, contractAddresses.DisputeManager, 'isAuthorizedManager', [address]);
    const { read: getDispute, isFetching: isFetchingDispute } = useContractRead(DisputeManagerABI, contractAddresses.DisputeManager, 'getDispute', [parseInt(disputeId) || 0]);
    const { read: getEvidenceCount, isFetching: isFetchingEvidenceCount } = useContractRead(DisputeManagerABI, contractAddresses.DisputeManager, 'getEvidenceCount', [parseInt(disputeId) || 0]);
    const { read: getEvidenceAtIndex, isFetching: isFetchingEvidenceAtIndex } = useContractRead(DisputeManagerABI, contractAddresses.DisputeManager, 'getEvidenceAtIndex', [parseInt(disputeId) || 0, parseInt(index) || 0]);

    const isFetching = isFetchingParticipant || isFetchingHasRole || isFetchingKycVerified || isFetchingKycStatus || isFetchingFarmerShipments || isFetchingTransporterShipments || isFetchingIndustryShipments || isFetchingShipment || isFetchingWeighmentCount || isFetchingWeighments || isFetchingLastWeighment || isFetchingShipmentVerified || isFetchingOracle || isFetchingIsOracle || isFetchingOracleCount || isFetchingOracleAtIndex || isFetchingVerifySignedPayload || isFetchingVerifySignedHash || isFetchingEscrow || isFetchingAuthorizedManager || isFetchingDispute || isFetchingEvidenceCount || isFetchingEvidenceAtIndex;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Blockchain State Viewer</CardTitle>
                <CardDescription>
                    Query view functions from the deployed smart contracts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="registration">
                        <AccordionTrigger>Registration Contract</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4">
                                <Label>Address:</Label>
                                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="0x..." />
                                <Button onClick={() => getParticipantFull()} disabled={isFetching}>getParticipantFull</Button>
                                <Button onClick={() => isKycVerified()} disabled={isFetching}>isKycVerified</Button>
                                <Button onClick={() => kycStatus()} disabled={isFetching}>kycStatus</Button>
                                <div className='flex items-center gap-2'>
                                    <Label>Role (0:Farmer, 1:Transporter, 2:Industry, 3:Government, 4:Oracle):</Label>
                                    <Input type="number" value={role} onChange={e => setRole(e.target.value)} />
                                    <Button onClick={() => hasRole()} disabled={isFetching}>hasRole</Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="shipment">
                        <AccordionTrigger>ShipmentToken Contract</AccordionTrigger>
                        <AccordionContent>
                             <div className="space-y-4">
                                <div>
                                    <Label>Participant Address:</Label>
                                    <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="0x..." />
                                    <Button onClick={() => getFarmerShipments()} disabled={isFetching}>getFarmerShipments</Button>
                                    <Button onClick={() => getTransporterShipments()} disabled={isFetching}>getTransporterShipments</Button>
                                    <Button onClick={() => getIndustryShipments()} disabled={isFetching}>getIndustryShipments</Button>
                                </div>
                                <hr/>
                                <div>
                                    <Label>Shipment ID (bytes32):</Label>
                                    <Input value={shipmentId} onChange={e => setShipmentId(e.target.value)} placeholder="0x..." />
                                    <Button onClick={() => getShipment()} disabled={isFetching}>getShipment</Button>
                                    <Button onClick={() => getWeighmentCount()} disabled={isFetching}>getWeighmentCount</Button>
                                    <Button onClick={() => getWeighments()} disabled={isFetching}>getWeighments</Button>
                                    <Button onClick={() => getLastWeighment()} disabled={isFetching}>getLastWeighment</Button>
                                    <Button onClick={() => isShipmentVerified()} disabled={isFetching}>isShipmentVerified</Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="oracle">
                        <AccordionTrigger>OracleManager Contract</AccordionTrigger>
                        <AccordionContent>
                           <div className="space-y-4">
                               <Button onClick={() => oracleCount()} disabled={isFetching}>oracleCount</Button>
                               <div className='flex items-center gap-2'>
                                   <Label>Index:</Label>
                                   <Input value={index} onChange={e => setIndex(e.target.value)} placeholder="0" />
                                   <Button onClick={() => oracleAtIndex()} disabled={isFetching}>oracleAtIndex</Button>
                               </div>
                               <hr/>
                               <div>
                                   <Label>Oracle Address:</Label>
                                   <Input value={oracleAddress} onChange={e => setOracleAddress(e.target.value)} placeholder="0x..." />
                                   <Button onClick={() => getOracle()} disabled={isFetching}>getOracle</Button>
                                   <Button onClick={() => isOracle()} disabled={isFetching}>isOracle</Button>
                               </div>
                               <hr/>
                               <div>
                                   <Label>Payload (bytes):</Label>
                                   <Input value={payload} onChange={e => setPayload(e.target.value)} placeholder="0x..." />
                                   <Label>Signature (bytes):</Label>
                                   <Input value={signature} onChange={e => setSignature(e.target.value)} placeholder="0x..." />
                                   <Button onClick={() => verifySignedPayload()} disabled={isFetching}>verifySignedPayload</Button>
                               </div>
                                <hr/>
                               <div>
                                   <Label>Hash (bytes32):</Label>
                                   <Input value={hash} onChange={e => setHash(e.target.value)} placeholder="0x..." />
                                   <Label>Signature (bytes):</Label>
                                   <Input value={signature} onChange={e => setSignature(e.target.value)} placeholder="0x..." />
                                   <Button onClick={() => verifySignedHash()} disabled={isFetching}>verifySignedHash</Button>
                               </div>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="escrow">
                        <AccordionTrigger>EscrowPayment Contract</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4">
                                <Label>Shipment ID (bytes32):</Label>
                                <Input value={shipmentId} onChange={e => setShipmentId(e.target.value)} placeholder="0x..." />
                                <Button onClick={() => getEscrow()} disabled={isFetching}>getEscrow</Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="dispute">
                        <AccordionTrigger>DisputeManager Contract</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4">
                                <Label>Manager Address:</Label>
                                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="0x..." />
                                <Button onClick={() => isAuthorizedManager()} disabled={isFetching}>isAuthorizedManager</Button>
                                <hr/>
                                <Label>Dispute ID (uint256):</Label>
                                <Input value={disputeId} onChange={e => setDisputeId(e.target.value)} placeholder="1" />
                                <Button onClick={() => getDispute()} disabled={isFetching}>getDispute</Button>
                                <Button onClick={() => getEvidenceCount()} disabled={isFetching}>getEvidenceCount</Button>
                                <div className='flex items-center gap-2'>
                                    <Label>Evidence Index:</Label>
                                    <Input value={index} onChange={e => setIndex(e.target.value)} placeholder="0" />
                                    <Button onClick={() => getEvidenceAtIndex()} disabled={isFetching}>getEvidenceAtIndex</Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {isFetching && <p>Loading...</p>}
                <ResultDisplay data={lastResult} />

            </CardContent>
        </Card>
    );
}
