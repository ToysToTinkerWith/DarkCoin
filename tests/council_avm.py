"""Council v3 real-ledger logic tests. Missing AlgoJig is a failure.
Run on a supported Linux host: pip install algojig pyteal pynacl
python contracts/CouncilDAO.py
python -m unittest discover -s tests -p council_avm.py -v

The final deployment uses AVM 8, the minimum version needed for its box opcodes.
PyPI AlgoJig 0.0.2 cannot model extra program pages; these tests exercise that
actual bytecode in a seeded ledger. Exact migration/page allocation and creator
funding must also pass current-mainnet group simulation before activation.
"""
import hashlib
import base64
import json
import sqlite3
from pathlib import Path
import unittest
from algojig import JigLedger, TealProgram, get_suggested_params
from algosdk import account, encoding, logic, transaction
from algosdk.encoding import msgpack
from nacl.signing import SigningKey

ROOT=Path(__file__).resolve().parent.parent
POLICY=json.loads((ROOT/'functions/council/protocol.json').read_text())
APP,NFT=1001,3001
u64=lambda n:int(n).to_bytes(8,'big')
sha=lambda b:hashlib.sha256(b).digest()
def layout(fields):
    offset,size={},0
    for name,width in fields.items():offset[name]=size;size+=width
    return offset,size
C,CS=layout(POLICY['configFields']);P,PS=layout(POLICY['proposalFields']);A,AS=layout(POLICY['actionFields'])
SIZE=PS;PMBR=2500+400*(11+SIZE);VMBR=2500+400*(19+48)
def pack(fields,values):return b''.join(u64(values.get(k,0)) if width==8 else values.get(k,bytes(width)) for k,width in fields.items())
pkey=lambda n:b'C3P'+u64(n)
vkey=lambda n:b'C3V'+u64(1)+u64(n)

def membership(ids):
    count=1
    while count<len(ids):count*=2
    levels=[[sha(b'DCDAO1'+u64(ids[i] if i<len(ids) else 0)) for i in range(count)]]
    while len(levels[-1])>1:
        old=levels[-1];levels.append([sha(old[i]+old[i+1]) for i in range(0,len(old),2)])
    proofs={nft:(slot,b''.join(level[(slot>>depth)^1] for depth,level in enumerate(levels[:-1]))) for slot,nft in enumerate(ids)}
    return levels[-1][0],len(levels)-1,proofs

class CouncilLedger(JigLedger):
    def write(self):
        super().write()
        # AlgoJig writes declarative balances straight into accountbase without
        # refreshing the aggregate totals. Large otherwise-valid transfers then
        # fail CalculateTotals with underflow. Reconcile the seeded ledger's
        # actual balances/statuses, leaving all AVM/fee/solvency checks enabled.
        with sqlite3.connect(self.filename) as db:
            level=db.execute("SELECT rewardslevel FROM accounttotals WHERE id='' ").fetchone()[0]
            totals={0:[0,0],1:[0,0],2:[0,0]}
            for (raw,) in db.execute('SELECT data FROM accountbase'):
                data=msgpack.unpackb(raw,raw=False,strict_map_key=False)
                status=int(data.get('a',0));balance=int(data.get('b',0));units=balance//1_000_000
                pending=units*(level-int(data.get('c',0))) if status!=2 else 0
                totals[status][0]+=balance+pending;totals[status][1]+=units
            db.execute("UPDATE accounttotals SET online=?,onlinerewardunits=?,offline=?,offlinerewardunits=?,notparticipating=?,notparticipatingrewardunits=? WHERE id=''",
                       (*totals[1],*totals[0],*totals[2]))

    def update_accounts(self, updated_accounts):
        # Match upstream AlgoJig's fix: retain resources of accounts not returned
        # by an evaluation. PyPI 0.0.2 resets these dictionaries unconditionally.
        # This repairs Python state carryover; execution remains the real AVM.
        assets=dict(self.assets);global_states=dict(self.global_states)
        super().update_accounts(updated_accounts)
        self.assets={**assets,**self.assets};self.global_states={**global_states,**self.global_states}

class CouncilV3AVM(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # AlgoJig 0.0.2's approval_filename path calls a mismatched internal
        # read_program signature. Its explicit program API is supported.
        cls.program=TealProgram(filename=str(ROOT/'contracts/council-dao/approval.teal'))

    def setUp(self):
        self.tx_sequence=0
        self.ledger=CouncilLedger();self.secret,self.sender=account.generate_account();self.other_secret,self.other=account.generate_account();self.address=logic.get_application_address(APP);self.signer=SigningKey(bytes([2])*32)
        self.ledger.create_app(APP,approval_program=self.program,creator=self.sender,global_ints=1,global_bytes=0,local_ints=0,local_bytes=0)
        for addr in [self.sender,self.other,self.address]:self.ledger.set_account_balance(addr,100_000_000)
        self.ledger.create_asset(NFT,{'total':1,'decimals':0,'creator':self.sender});self.ledger.set_account_balance(self.sender,1,NFT)
        root,depth,self.proofs=membership(list(range(NFT,NFT+50)))
        self.config={**{k:int(v) for k,v in POLICY['defaults'].items()},'version':3,'next':1,'revision':1,'members':50,'depth':depth,'root':root,
            'host':encoding.decode_address(self.other),'quoteSigner':bytes(self.signer.verify_key),'executor':encoding.decode_address(self.sender),'tinyman':148607000}
        # Exercise real initialization in every normal test, rather than injecting
        # a configuration that could not pass the creator/registry checks.
        self.execute([self.app([b'initialize',pack(POLICY['configFields'],self.config)])])
        self.actions=b''
    def setconfig(self):self.ledger.set_box(APP,b'C3C',pack(POLICY['configFields'],self.config))
    def sp(self,units=1):
        sp=get_suggested_params();sp.flat_fee=True;sp.fee=1000*units;return sp
    def app(self,args,extra=(),assets=(),accounts=(),apps=(),units=1,sender=None):
        self.tx_sequence+=1
        return transaction.ApplicationNoOpTxn(sender or self.sender,self.sp(units),APP,app_args=args,boxes=[(0,b'C3C'),(0,pkey(1)),(0,pkey(1)),*[(0,b) for b in extra]],foreign_assets=list(assets),foreign_apps=list(apps),accounts=list(accounts),note=f'Council test step {self.tx_sequence}'.encode())
    def execute(self,txns,ts=1000,secret=None):
        transaction.assign_group_id(txns);return self.ledger.eval_transactions([t.sign(secret or self.secret) for t in txns],block_timestamp=ts)
    def seed(self,actions=(),**fields):
        self.actions=b''.join(pack(POLICY['actionFields'],a) for a in actions)
        self.fields={'owner':encoding.decode_address(self.sender),'digest':bytes(32),'actionsHash':sha(self.actions),'fee':20_000_000,'rewardPool':8_000_000,'rewardPerVote':8_000_000//self.config['members'],'eligibleMembers':self.config['members'],'deadline':2000,'minVotes':50,'approvalBps':6000,'actionCount':len(actions),**fields}
        turnout=sum(self.fields.get(k,0) for k in ['yes','no','abstain'])
        self.fields.setdefault('rewardPaid',turnout*self.fields['rewardPerVote'])
        self.ledger.set_box(APP,pkey(1),pack(POLICY['proposalFields'],self.fields))
        self.config['rewardReserved']=self.fields['rewardPerVote']*self.fields['eligibleMembers']-self.fields['rewardPaid'] if not self.fields.get('state') else 0
        self.setconfig()
    def value(self,key,offset):return int.from_bytes(self.ledger.get_box(APP,key)[offset:offset+8],'big')
    def proposal(self):
        digest=sha(b'proposal');words=400;fee=18_000_000;expiry=2800;actions=b''
        message=b'DCCOUNCIL3'+u64(APP)+digest+sha(actions)+encoding.decode_address(self.sender)+u64(fee)+u64(words)+u64(0)+u64(expiry)+u64(1)
        signature=self.signer.sign(message).signature
        return [transaction.PaymentTxn(self.sender,self.sp(),self.address,fee),transaction.PaymentTxn(self.sender,self.sp(),self.address,PMBR),self.app([b'budget']),self.app([b'budget']),self.app([b'budget']),self.app([b'propose',u64(1),digest,actions,u64(words),u64(0),u64(expiry),u64(1),signature],accounts=[self.other],units=2)]
    def vote(self,choice=1,payment=VMBR,id=u64(1),nft=NFT,proof=None,slot=None,sender=None,units=2):
        sender=sender or self.sender;default_slot,default_proof=self.proofs.get(nft,(0,b''))
        slot=default_slot if slot is None else slot;proof=default_proof if proof is None else proof
        return [transaction.PaymentTxn(sender,self.sp(),self.address,payment),self.app([b'budget'],sender=sender),self.app([b'budget'],sender=sender),self.app([b'vote',id,u64(nft),u64(choice),u64(slot),proof],extra=[vkey(nft)],assets=[nft],sender=sender,units=units)]
    def action(self,method,extra=(),boxes=(),assets=(),accounts=(),apps=(),units=1,sender=None):
        if method==b'execute':extra=[*extra,self.actions]
        budget=[self.app([b'budget'],sender=sender) for _ in range(3 if method==b'execute' else 2)]
        return budget+[self.app([method,u64(1),*extra],extra=boxes,assets=assets,accounts=accounts,apps=apps,units=units,sender=sender)]
    def test_fee_split_signature_and_duration(self):
        before=self.ledger.get_account_balance(self.other)[0];self.execute(self.proposal())
        self.assertEqual(self.ledger.get_account_balance(self.other)[0]-before,7_200_000)
        self.assertEqual(self.value(b'C3C',C['rewardReserved']),7_200_000)
        self.assertEqual(self.value(pkey(1),P['rewardPerVote']),144_000)
        self.assertEqual(self.value(pkey(1),P['eligibleMembers']),50)
        self.assertEqual(len(self.ledger.get_box(APP,pkey(1))),PS)
        self.assertEqual(self.value(pkey(1),P['deadline']),1000+14*86400)
    def test_altered_payment_or_signature_rejected(self):
        group=self.proposal();group[0].amt-=1
        with self.assertRaises(Exception):self.execute(group)
        group=self.proposal();group[-1].app_args[-1]=bytes(64)
        with self.assertRaises(Exception):self.execute(group)
    def test_vote_change_keeps_one_ballot_and_original_beneficiary(self):
        self.seed();self.execute(self.vote());before=self.ledger.get_account_balance(self.sender)[0];self.execute(self.vote(choice=2,payment=0,units=1))
        self.assertEqual(self.ledger.get_account_balance(self.sender)[0]-before,-4000)
        self.assertEqual(self.value(pkey(1),P['rewardPaid']),160_000)
        self.assertEqual(self.value(pkey(1),P['yes']),0);self.assertEqual(self.value(pkey(1),P['no']),1)
        self.assertEqual(self.ledger.get_box(APP,vkey(NFT))[:32],encoding.decode_address(self.sender))
    def test_short_proposal_id_cannot_create_duplicate_ballot(self):
        self.seed();self.execute(self.vote())
        with self.assertRaises(Exception):self.execute(self.vote(id=b'\x01'))
    def test_maximum_proof_depth_fits_normal_budget(self):
        root,depth,self.proofs=membership(list(range(NFT,NFT+4096)))
        self.config.update(members=4096,depth=depth,root=root);self.seed();self.execute(self.vote())
        self.assertEqual(self.value(pkey(1),P['yes']),1)
    def test_exact_threshold_and_no_quorum(self):
        for yes,no,abstain,want in [(30,20,0,1),(29,21,0,2),(3,2,45,1),(30,19,0,2),(0,0,50,2)]:
            self.config['rewardReserved']=8_000_000;self.setconfig();self.seed(yes=yes,no=no,abstain=abstain);self.execute(self.action(b'finalize'),ts=2000);self.assertEqual(self.value(pkey(1),P['state']),want)
    def test_storage_refund_after_rejection_does_not_pay_another_reward(self):
        self.seed();self.execute(self.vote(choice=2));self.execute(self.action(b'finalize'),ts=2000)
        before=self.ledger.get_account_balance(self.sender)[0];self.execute(self.action(b'claim',[u64(NFT)],[vkey(NFT)],units=2),ts=2001)
        self.assertEqual(self.ledger.get_account_balance(self.sender)[0]-before,VMBR-4000)
        with self.assertRaises(Exception):self.execute(self.action(b'claim',[u64(NFT)],[vkey(NFT)],units=2),ts=2002)
    def test_frozen_payment_executes_once_and_cannot_spend_voter_reserves(self):
        self.seed(actions=[{'kind':0,'amount':25_000_000,'recipient':encoding.decode_address(self.other)}],state=1)
        before=self.ledger.get_account_balance(self.other)[0];self.execute(self.action(b'execute',[u64(0)],accounts=[self.other],units=2),ts=2001)
        self.assertEqual(self.ledger.get_account_balance(self.other)[0]-before,25_000_000)
        with self.assertRaises(Exception):self.execute(self.action(b'execute',[u64(0)],accounts=[self.other],units=2),ts=2002)
        self.seed(actions=[{'kind':0,'amount':30_000_000,'recipient':encoding.decode_address(self.other)}],state=1);self.config['rewardReserved']=80_000_000;self.setconfig()
        with self.assertRaises(Exception):self.execute(self.action(b'execute',[u64(0)],accounts=[self.other],units=2),ts=2003)
    def test_creator_delete_and_nonexecutor_calls_denied(self):
        self.seed(actions=[{'kind':1,'asset':NFT}],state=1)
        with self.assertRaises(Exception):self.execute(self.action(b'execute',[u64(0)],assets=[NFT],sender=self.other),secret=self.other_secret)
        with self.assertRaises(Exception):self.execute([transaction.ApplicationDeleteTxn(self.sender,self.sp(),APP)])

    def test_initialize_rejects_duplicates_noncreator_and_bad_registry(self):
        self.assertEqual(self.value(b'C3C',C['members']),50)
        with self.assertRaises(Exception):self.execute([self.app([b'initialize',pack(POLICY['configFields'],self.config)])])
        self.ledger.boxes[APP].pop(b'C3C')
        with self.assertRaises(Exception):self.execute([self.app([b'initialize',pack(POLICY['configFields'],self.config)],sender=self.other)],secret=self.other_secret)
        self.config['members']=49
        with self.assertRaises(Exception):self.execute([self.app([b'initialize',pack(POLICY['configFields'],self.config)])])
        self.config.update(members=50,paused=1)
        self.execute([self.app([b'initialize',pack(POLICY['configFields'],self.config)])])
        self.assertEqual(self.value(b'C3C',C['paused']),1)

    def test_first_vote_pays_inside_the_vote_group_before_finalization(self):
        self.execute(self.proposal());before=self.ledger.get_account_balance(self.sender)[0]
        self.execute(self.vote())
        self.assertEqual(self.ledger.get_account_balance(self.sender)[0]-before,144_000-VMBR-5000)
        self.assertEqual(self.value(pkey(1),P['rewardPaid']),144_000)
        self.assertEqual(self.value(vkey(NFT),40),144_000)
        self.assertEqual(self.value(b'C3C',C['rewardReserved']),7_200_000-144_000)
        self.assertEqual(self.value(pkey(1),P['state']),0)
        with self.assertRaises(Exception):self.execute(self.action(b'claim',[u64(NFT)],[vkey(NFT)],units=2))

    def test_transferred_ballot_keeps_original_reward_and_refund_owner(self):
        self.seed();self.execute(self.vote())
        self.ledger.set_account_balance(self.sender,0,NFT);self.ledger.set_account_balance(self.other,1,NFT)
        before=self.ledger.get_account_balance(self.other)[0]
        self.execute(self.vote(choice=3,payment=0,sender=self.other,units=1),secret=self.other_secret)
        self.assertEqual(self.ledger.get_account_balance(self.other)[0]-before,-4000)
        self.assertEqual(self.value(pkey(1),P['rewardPaid']),160_000)
        self.assertEqual(self.value(pkey(1),P['abstain']),1)
        self.assertEqual(self.ledger.get_box(APP,vkey(NFT))[:32],encoding.decode_address(self.sender))

    def test_invalid_proof_and_missing_inner_fee_do_not_pay(self):
        self.seed()
        for kwargs in [{'proof':bytes(len(self.proofs[NFT][1]))},{'units':1}]:
            with self.assertRaises(Exception):self.execute(self.vote(**kwargs))
        self.assertFalse(self.ledger.box_exists(APP,vkey(NFT)))
        self.assertEqual(self.value(pkey(1),P['rewardPaid']),0)

    def test_finalize_releases_unearned_reserve_without_clawing_back_paid_rewards(self):
        self.seed();self.execute(self.vote());before=self.ledger.get_account_balance(self.sender)[0]
        self.assertEqual(self.value(b'C3C',C['rewardReserved']),7_840_000)
        self.execute(self.action(b'finalize'),ts=2000)
        self.assertEqual(self.value(b'C3C',C['rewardReserved']),0)
        self.assertEqual(self.value(pkey(1),P['rewardPaid']),160_000)
        self.assertEqual(self.ledger.get_account_balance(self.sender)[0]-before,-3000)

    def test_pause_keeps_votes_finalization_and_storage_refunds_available(self):
        self.execute([self.app([b'pause',u64(1)])])
        with self.assertRaises(Exception):self.execute(self.proposal())
        self.execute([self.app([b'pause',u64(0)])]);self.execute(self.proposal())
        self.execute([self.app([b'pause',u64(1)])]);self.execute(self.vote())
        deadline=self.value(pkey(1),P['deadline'])
        self.execute(self.action(b'finalize'),ts=deadline)
        self.execute(self.action(b'claim',[u64(NFT)],[vkey(NFT)],units=2),ts=deadline+1)
        self.config['paused']=1
        self.seed(actions=[{'kind':0,'amount':1,'recipient':encoding.decode_address(self.other)}],state=1)
        with self.assertRaises(Exception):self.execute(self.action(b'execute',[u64(0)],accounts=[self.other],units=2))
        self.execute([self.app([b'pause',u64(0)])]);self.execute(self.action(b'execute',[u64(0)],accounts=[self.other],units=2))

    def test_firebase_action_payload_is_hash_bound_and_execution_is_ordered(self):
        self.seed(actions=[{'kind':0,'amount':2_000_000,'recipient':encoding.decode_address(self.other)},
                           {'kind':0,'amount':3_000_000,'recipient':encoding.decode_address(self.other)}],state=1)
        with self.assertRaises(Exception):self.execute(self.action(b'execute',[u64(1)],accounts=[self.other],units=2))
        group=self.action(b'execute',[u64(0)],accounts=[self.other],units=2)
        altered=bytearray(self.actions);altered[A['amount']+7]^=1;group[-1].app_args[-1]=bytes(altered)
        with self.assertRaises(Exception):self.execute(group)
        before=self.ledger.get_account_balance(self.other)[0]
        self.execute(self.action(b'execute',[u64(0)],accounts=[self.other],units=2))
        self.execute(self.action(b'execute',[u64(1)],accounts=[self.other],units=2))
        self.assertEqual(self.ledger.get_account_balance(self.other)[0]-before,5_000_000)

    def test_rules_and_last_action_executor_rotation(self):
        self.seed(actions=[{'kind':3,'setting':POLICY['settings'].index('baseFee'),'value':12_000_000},
                           {'kind':4,'setting':2,'recipient':encoding.decode_address(self.other)}],state=1)
        self.execute(self.action(b'execute',[u64(0)]))
        self.assertEqual(self.value(b'C3C',C['baseFee']),12_000_000)
        self.execute(self.action(b'execute',[u64(1)]))
        self.assertEqual(self.ledger.get_box(APP,b'C3C')[C['executor']:C['executor']+32],encoding.decode_address(self.other))
        self.assertEqual(self.value(b'C3C',C['revision']),3)

    def test_executor_rotation_cannot_strand_following_actions(self):
        self.seed(actions=[{'kind':4,'setting':2,'recipient':encoding.decode_address(self.other)},{'kind':1,'asset':NFT}],state=1)
        with self.assertRaises(Exception):self.execute(self.action(b'execute',[u64(0)]))

    def test_asa_opt_in_and_transfer(self):
        self.seed(actions=[{'kind':1,'asset':NFT},{'kind':0,'asset':NFT,'amount':1,'recipient':encoding.decode_address(self.other)}],state=1)
        self.execute(self.action(b'execute',[u64(0)],assets=[NFT],units=2))
        self.ledger.set_account_balance(self.address,1,NFT);self.ledger.opt_in_asset(self.other,NFT)
        self.execute(self.action(b'execute',[u64(1)],assets=[NFT],accounts=[self.other],units=2))
        self.assertEqual(self.ledger.get_account_balance(self.other,NFT)[0],1)

    def tinyman_pool(self,asset_1,asset_2):
        fixture=json.loads((ROOT/'tests/fixtures/council-tinyman-v2.json').read_text())
        bytecode=base64.b64decode(fixture['approvalProgram'])
        self.assertEqual(hashlib.sha256(bytecode).hexdigest(),fixture['sha256'])
        # GoJig scans every integer up to the largest app/asset ID after each
        # evaluation. Bind the identical real validator bytecode to a small
        # sandbox ID; production still initializes with the actual network ID.
        validator=2001;self.config['tinyman']=validator;app_address=logic.get_application_address(validator)
        self.ledger.create_app(validator,approval_program=TealProgram(bytecode=bytecode),creator=self.ledger.creator,
                               local_ints=12,local_bytes=2,global_ints=0,global_bytes=3)
        self.ledger.set_account_balance(app_address,1_000_000)
        self.ledger.set_global_state(validator,{key:encoding.decode_address(self.ledger.creator) for key in [b'fee_collector',b'fee_manager',b'fee_setter']})
        _,pool=account.generate_account();self.ledger.set_account_balance(pool,2_000_000)
        self.ledger.set_auth_addr(pool,app_address)
        for asset in [asset_1,asset_2]:
            if asset:
                self.ledger.create_asset(asset,{'total':1_000_000_000,'decimals':6})
                self.ledger.set_account_balance(pool,1_000_000,asset)
        pool_token=self.ledger.create_asset(None,{'creator':app_address})
        self.ledger.set_account_balance(app_address,0,pool_token)
        self.ledger.set_account_balance(pool,18446744073709551615-999000,pool_token)
        self.ledger.set_local_state(pool,validator,{
            b'asset_1_id':asset_1,b'asset_2_id':asset_2,b'pool_token_asset_id':pool_token,
            b'total_fee_share':30,b'protocol_fee_ratio':6,
            b'asset_1_reserves':1_000_000,b'asset_2_reserves':1_000_000,b'issued_pool_tokens':1_000_000,
            b'asset_1_cumulative_price':bytes(8),b'asset_2_cumulative_price':bytes(8),
            b'cumulative_price_update_timestamp':0,b'lock':0,b'asset_1_protocol_fees':0,b'asset_2_protocol_fees':0,
        })
        return pool,validator

    def assert_swap_receipt(self,block,pool,asset,amount):
        receipts=[]
        def walk(node,depth):
            tx=node.get(b'txn',{})
            if depth==2 and tx.get(b'snd')==encoding.decode_address(pool):receipts.append(tx)
            for child in node.get(b'dt',{}).get(b'itx',[]):walk(child,depth+1)
        for node in block.get(b'txns',[]):walk(node,0)
        self.assertEqual(len(receipts),1,'the actual validator must emit exactly one output payment')
        output=receipts[0]
        self.assertEqual(output.get(b'type'),b'axfer' if asset else b'pay')
        self.assertEqual(output.get(b'xaid',0),asset)
        self.assertEqual(output.get(b'aamt' if asset else b'amt'),amount)
        self.assertEqual(output.get(b'arcv' if asset else b'rcv'),encoding.decode_address(self.address))
        self.assertEqual(self.value(pkey(1),P['executed']),1)

    def test_real_tinyman_algo_to_asa_swap_opts_in_and_receives_output(self):
        pool,validator=self.tinyman_pool(5002,0)
        self.seed(actions=[{'kind':2,'asset':0,'amount':10000,'outputAsset':5002,'pool':encoding.decode_address(pool)}],state=1)
        # Explicitly list the already-implicit current application account so
        # old GoJig also returns its changed balances to the Python fixture.
        block=self.execute(self.action(b'execute',[u64(0)],assets=[5002,0],accounts=[pool,self.address],apps=[validator],units=6),ts=2001)
        self.assert_swap_receipt(block,pool,5002,9871)
        self.assertEqual(self.ledger.get_account_balance(self.address,5002)[0],9871)
        self.assertEqual(self.value(pkey(1),P['executed']),1)

    def test_real_tinyman_asa_to_algo_swap_returns_algo_to_treasury(self):
        pool,validator=self.tinyman_pool(5002,0)
        self.ledger.set_account_balance(self.address,10000,5002)
        self.seed(actions=[{'kind':2,'asset':5002,'amount':10000,'outputAsset':0,'pool':encoding.decode_address(pool)}],state=1)
        before=self.ledger.get_account_balance(self.address)[0]
        block=self.execute(self.action(b'execute',[u64(0)],assets=[5002,0],accounts=[pool,self.address],apps=[validator],units=6),ts=2001)
        self.assert_swap_receipt(block,pool,0,9871)
        self.assertEqual(self.ledger.get_account_balance(self.address)[0]-before,9871)
        self.assertEqual(self.ledger.get_account_balance(self.address,5002)[0],0)

    def test_real_tinyman_asa_to_asa_and_failed_low_input_remains_retryable(self):
        pool,validator=self.tinyman_pool(5002,5001)
        self.ledger.set_account_balance(self.address,10000,5002)
        self.seed(actions=[{'kind':2,'asset':5002,'amount':1,'outputAsset':5001,'pool':encoding.decode_address(pool)}],state=1)
        with self.assertRaises(Exception):self.execute(self.action(b'execute',[u64(0)],assets=[5002,5001],accounts=[pool,self.address],apps=[validator],units=6),ts=2001)
        self.assertEqual(self.value(pkey(1),P['executed']),0)
        self.assertEqual(self.ledger.get_account_balance(self.address,5002)[0],10000)
        self.seed(actions=[{'kind':2,'asset':5002,'amount':10000,'outputAsset':5001,'pool':encoding.decode_address(pool)}],state=1)
        block=self.execute(self.action(b'execute',[u64(0)],assets=[5002,5001],accounts=[pool,self.address],apps=[validator],units=6),ts=2001)
        self.assert_swap_receipt(block,pool,5001,9871)
        self.assertEqual(self.ledger.get_account_balance(self.address,5001)[0],9871)

if __name__=='__main__':unittest.main()
