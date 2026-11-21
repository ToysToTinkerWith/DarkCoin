"""Council v3. Box-only state permits migration of the legacy 1-uint schema.
Compile only; this module never signs, updates an application or moves funds.
"""
import json
from pathlib import Path
from pyteal import *

ROOT = Path(__file__).resolve().parent.parent
POLICY = json.loads((ROOT / 'functions/council/protocol.json').read_text())
def layout(fields):
    offsets, size = {}, 0
    for field, width in fields.items(): offsets[field] = size; size += width
    return offsets, size
C, CS = layout(POLICY['configFields'])
P, PS = layout(POLICY['proposalFields'])
A, AS = layout(POLICY['actionFields'])
SIZE = PS  # The full manifest (including actions) lives in Firebase.
PMBR = 2500 + 400 * (11 + SIZE)
VMBR = 2500 + 400 * (19 + POLICY['voteSize'])
CM = Bytes('C3C')

def approval_program():
    def cfg(name): return Btoi(App.box_extract(CM, Int(C[name]), Int(8)))
    def addr(name): return App.box_extract(CM, Int(C[name]), Int(32))
    def cp(name, value): return App.box_replace(CM, Int(C[name]), Itob(value))
    def pkey(id): return Concat(Bytes('C3P'), Itob(id))
    def pn(name): return Btoi(App.box_extract(p.load(), Int(P[name]), Int(8)))
    def pp(name, value): return App.box_replace(p.load(), Int(P[name]), Itob(value))
    def funding(index, amount):
        tx = Gtxn[index]
        return Assert(And(tx.type_enum() == TxnType.Payment, tx.sender() == Txn.sender(),
            tx.receiver() == Global.current_application_address(), tx.amount() == amount,
            tx.rekey_to() == Global.zero_address(), tx.close_remainder_to() == Global.zero_address()))
    @Subroutine(TealType.none)
    def pay(receiver, amount):
        return If(amount > Int(0)).Then(Seq(InnerTxnBuilder.Begin(), InnerTxnBuilder.SetFields({TxnField.type_enum:TxnType.Payment,TxnField.receiver:receiver,TxnField.amount:amount,TxnField.fee:Int(0)}), InnerTxnBuilder.Submit()))
    @Subroutine(TealType.none)
    def solvent():
        return Assert(Balance(Global.current_application_address()) >= MinBalance(Global.current_application_address()) + cfg('rewardReserved'))
    @Subroutine(TealType.none)
    def transfer(asset, receiver, amount):
        return Seq(If(asset == Int(0)).Then(pay(receiver, amount)).Else(Seq(InnerTxnBuilder.Begin(),InnerTxnBuilder.SetFields({TxnField.type_enum:TxnType.AssetTransfer,TxnField.xfer_asset:asset,TxnField.asset_receiver:receiver,TxnField.asset_amount:amount,TxnField.fee:Int(0)}),InnerTxnBuilder.Submit())),solvent())
    @Subroutine(TealType.none)
    def opt(asset):
        holding = AssetHolding.balance(Global.current_application_address(), asset)
        return Seq(holding, If(Not(holding.hasValue())).Then(transfer(asset, Global.current_application_address(), Int(0))))
    p, v, root, action, pool = [ScratchVar(TealType.bytes) for _ in range(5)]
    i, slot, nft, choice, old, fee, host, reward, duration, turnout, index, kind, asset, amount, outasset, a1, a2, rin, rout, net, minout, setting, val = [ScratchVar(TealType.uint64) for _ in range(23)]
    initialized = App.box_length(CM)
    loadp = Seq(p.store(pkey(Btoi(Txn.application_args[1]))), Pop(App.box_extract(p.load(), Int(0), Int(1))))
    # Creation/update never resets state; initialize is a separate creator-only group.
    init = Seq(Assert(Txn.sender() == Global.creator_address()), Assert(Txn.application_args.length() == Int(2)),
        Assert(Len(Txn.application_args[1]) == Int(CS)), Assert(App.box_create(CM,Int(CS))),
        App.box_put(CM,Txn.application_args[1]), Assert(cfg('version')==Int(3)), Assert(cfg('next')==Int(1)),
        Assert(cfg('rewardReserved')==Int(0)), Assert(cfg('revision')==Int(1)), Assert(cfg('paused')<=Int(1)),
        Assert(cfg('members')>=Int(50)), Assert(cfg('members')<=Int(4096)), Assert(cfg('depth')<=Int(12)),
        Assert(cfg('members')<=Exp(Int(2),cfg('depth'))),Assert(addr('root')!=Global.zero_address()),
        Assert(Or(cfg('tinyman')==Int(1002541853),cfg('tinyman')==Int(148607000))),
        Assert(addr('host')!=Global.zero_address()), Assert(addr('quoteSigner')!=Global.zero_address()),Assert(addr('executor')!=Global.zero_address()),
        *[Assert(cfg(name)==Int(int(value))) for name,value in POLICY['defaults'].items()],solvent(),Approve())
    # propose args: method,id,digest,actions,words,images,expiry,revision,signature
    propose = Seq(Assert(cfg('paused')==Int(0)), Assert(Global.group_size()==Int(6)),Assert(Txn.group_index()==Int(5)),
        Assert(Txn.application_args.length()==Int(9)),Assert(Btoi(Txn.application_args[1])==cfg('next')),
        Assert(Len(Txn.application_args[2])==Int(32)),Assert(Len(Txn.application_args[3])%Int(AS)==Int(0)),Assert(Len(Txn.application_args[3])<=Int(AS*8)),
        Assert(Btoi(Txn.application_args[4])<=Int(10000)),Assert(Btoi(Txn.application_args[5])<=Int(5)),
        Assert(Global.latest_timestamp()<=Btoi(Txn.application_args[6])), Assert(Btoi(Txn.application_args[6])<=Global.latest_timestamp()+Int(3600)),
        Assert(Btoi(Txn.application_args[7])==cfg('revision')),
        fee.store(cfg('baseFee')+cfg('wordFee')*Btoi(Txn.application_args[4])+cfg('imageFee')*Btoi(Txn.application_args[5])),
        Assert(Ed25519Verify_Bare(Concat(Bytes('DCCOUNCIL3'),Itob(Global.current_application_id()),Txn.application_args[2],Sha256(Txn.application_args[3]),Txn.sender(),Itob(fee.load()),Txn.application_args[4],Txn.application_args[5],Txn.application_args[6],Txn.application_args[7]),Txn.application_args[8],addr('quoteSigner'))),
        funding(Int(0),fee.load()),funding(Int(1),Int(PMBR)),
        p.store(pkey(cfg('next'))),Assert(App.box_create(p.load(),Int(SIZE))),
        App.box_replace(p.load(),Int(P['owner']),Txn.sender()),App.box_replace(p.load(),Int(P['digest']),Txn.application_args[2]),
        App.box_replace(p.load(),Int(P['actionsHash']),Sha256(Txn.application_args[3])),
        duration.store(Btoi(Txn.application_args[4])+Btoi(Txn.application_args[5])*Int(250)),
        duration.store(If(duration.load()<=cfg('shortMax'),cfg('shortDays'),If(duration.load()<=cfg('mediumMax'),cfg('mediumDays'),cfg('longDays')))*Int(86400)),
        host.store(WideRatio([fee.load(),cfg('hostBps')],[Int(10000)])),reward.store(WideRatio([fee.load(),cfg('rewardBps')],[Int(10000)])),
        *[pp(name,value) for name,value in [('fee',fee.load()),('rewardPool',reward.load()),('rewardPerVote',reward.load()/cfg('members')),('eligibleMembers',cfg('members')),('created',Global.latest_timestamp()),('deadline',Global.latest_timestamp()+duration.load()),('revision',cfg('revision')),('wordCount',Btoi(Txn.application_args[4])),('imageCount',Btoi(Txn.application_args[5])),('actionCount',Len(Txn.application_args[3])/Int(AS)),('minVotes',cfg('minVotes')),('approvalBps',cfg('approvalBps'))]],
        cp('next',cfg('next')+Int(1)),cp('rewardReserved',cfg('rewardReserved')+pn('rewardPerVote')*pn('eligibleMembers')),pay(addr('host'),host.load()),solvent(),Approve())
    holding = AssetHolding.balance(Txn.sender(),nft.load())
    ballot = App.box_get(v.load())
    vote = Seq(Assert(Global.group_size()==Int(4)),Assert(Txn.group_index()==Int(3)),Assert(Txn.application_args.length()==Int(6)),*[Assert(Len(Txn.application_args[n])==Int(8)) for n in range(1,5)],loadp,
        Assert(pn('state')==Int(0)),Assert(Global.latest_timestamp()<pn('deadline')),
        nft.store(Btoi(Txn.application_args[2])),choice.store(Btoi(Txn.application_args[3])),Assert(choice.load()>=Int(1)),Assert(choice.load()<=Int(3)),
        holding,Assert(holding.hasValue()),Assert(holding.value()==Int(1)),slot.store(Btoi(Txn.application_args[4])),Assert(slot.load()<cfg('members')),
        Assert(Len(Txn.application_args[5])==cfg('depth')*Int(32)),root.store(Sha256(Concat(Bytes('DCDAO1'),Itob(nft.load())))),
        For(i.store(Int(0)),i.load()<cfg('depth'),i.store(i.load()+Int(1))).Do(Seq(root.store(Sha256(If(slot.load()%Int(2)==Int(0),Concat(root.load(),Extract(Txn.application_args[5],i.load()*Int(32),Int(32))),Concat(Extract(Txn.application_args[5],i.load()*Int(32),Int(32)),root.load())))),slot.store(slot.load()/Int(2)))),Assert(root.load()==addr('root')),
        v.store(Concat(Bytes('C3V'),Txn.application_args[1],Itob(nft.load()))),ballot,
        If(ballot.hasValue()).Then(Seq(funding(Int(0),Int(0)),old.store(Btoi(Extract(ballot.value(),Int(32),Int(8)))),
            Cond(*[[old.load()==Int(n),pp(field,pn(field)-Int(1))] for n,field in [(1,'yes'),(2,'no'),(3,'abstain')]]),App.box_replace(v.load(),Int(32),Itob(choice.load())))).Else(Seq(
                funding(Int(0),Int(VMBR)),Assert(App.box_create(v.load(),Int(48))),
                reward.store(pn('rewardPerVote')),
                Assert(pn('yes')+pn('no')+pn('abstain')<pn('eligibleMembers')),
                App.box_put(v.load(),Concat(Txn.sender(),Itob(choice.load()),Itob(reward.load()))),
                pp('rewardPaid',pn('rewardPaid')+reward.load()),
                cp('rewardReserved',cfg('rewardReserved')-reward.load()),pay(Txn.sender(),reward.load()),solvent())),
        Cond(*[[choice.load()==Int(n),pp(field,pn(field)+Int(1))] for n,field in [(1,'yes'),(2,'no'),(3,'abstain')]]),Approve())
    finalize = Seq(loadp,Assert(pn('state')==Int(0)),Assert(Global.latest_timestamp()>=pn('deadline')),turnout.store(pn('yes')+pn('no')+pn('abstain')),
        pp('state',If(And(turnout.load()>=pn('minVotes'),pn('yes')+pn('no')>Int(0),pn('yes')*Int(10000)>=(pn('yes')+pn('no'))*pn('approvalBps')),Int(1),Int(2))),
        cp('rewardReserved',cfg('rewardReserved')-(pn('rewardPerVote')*pn('eligibleMembers')-pn('rewardPaid'))),Approve())
    claim = Seq(Assert(Txn.application_args.length()==Int(3)),Assert(Len(Txn.application_args[1])==Int(8)),Assert(Len(Txn.application_args[2])==Int(8)),loadp,Assert(pn('state')!=Int(0)),v.store(Concat(Bytes('C3V'),Txn.application_args[1],Txn.application_args[2])),ballot,Assert(ballot.hasValue()),Assert(Extract(ballot.value(),Int(0),Int(32))==Txn.sender()),
        Assert(App.box_delete(v.load())),pp('claimed',pn('claimed')+Int(1)),pay(Txn.sender(),Int(VMBR)),solvent(),Approve())
    # Execution can only consume frozen actions in a passed proposal. The worker
    # cannot substitute an asset, amount, recipient or Tinyman pool at runtime.
    def an(name): return Btoi(Extract(action.load(),Int(A[name]),Int(8)))
    poola1=App.localGetEx(pool.load(),cfg('tinyman'),Bytes('asset_1_id'))
    poola2=App.localGetEx(pool.load(),cfg('tinyman'),Bytes('asset_2_id'))
    poolr1=App.localGetEx(pool.load(),cfg('tinyman'),Bytes('asset_1_reserves'))
    poolr2=App.localGetEx(pool.load(),cfg('tinyman'),Bytes('asset_2_reserves'))
    poolfee=App.localGetEx(pool.load(),cfg('tinyman'),Bytes('total_fee_share'))
    swap = Seq(poola1,poola2,poolr1,poolr2,poolfee,Assert(And(poola1.hasValue(),poola2.hasValue(),poolr1.hasValue(),poolr2.hasValue(),poolfee.hasValue())),
        a1.store(poola1.value()),a2.store(poola2.value()),Assert(Or(And(asset.load()==a1.load(),outasset.load()==a2.load()),And(asset.load()==a2.load(),outasset.load()==a1.load()))),
        Assert(poolfee.value()<Int(10000)),rin.store(If(asset.load()==a1.load(),poolr1.value(),poolr2.value())),rout.store(If(asset.load()==a1.load(),poolr2.value(),poolr1.value())),Assert(rin.load()>Int(0)),Assert(rout.load()>Int(0)),
        net.store(amount.load()-WideRatio([amount.load(),poolfee.value()],[Int(10000)])),
        minout.store(rout.load()-WideRatio([rin.load(),rout.load()],[rin.load()+net.load()])-Int(1)),minout.store(WideRatio([minout.load(),Int(10000)-cfg('slippageBps')],[Int(10000)])),Assert(minout.load()>Int(0)),
        If(outasset.load()>Int(0)).Then(opt(outasset.load())),
        InnerTxnBuilder.Begin(),InnerTxnBuilder.SetFields({TxnField.type_enum:If(asset.load()==Int(0),TxnType.Payment,TxnType.AssetTransfer),TxnField.fee:Int(0)}),
        If(asset.load()==Int(0)).Then(InnerTxnBuilder.SetFields({TxnField.receiver:pool.load(),TxnField.amount:amount.load()})).Else(InnerTxnBuilder.SetFields({TxnField.xfer_asset:asset.load(),TxnField.asset_receiver:pool.load(),TxnField.asset_amount:amount.load()})),
        InnerTxnBuilder.Next(),InnerTxnBuilder.SetFields({TxnField.type_enum:TxnType.ApplicationCall,TxnField.application_id:cfg('tinyman'),TxnField.on_completion:OnComplete.NoOp,TxnField.application_args:[Bytes('swap'),Bytes('fixed-input'),Itob(minout.load())],TxnField.assets:[a1.load(),a2.load()],TxnField.accounts:[pool.load()],TxnField.fee:Int(0)}),InnerTxnBuilder.Submit(),solvent())
    policy = Seq(setting.store(an('setting')),val.store(an('value')),Assert(setting.load()<Int(len(POLICY['settings']))),
        Cond(*[[setting.load()==Int(i),cp(name,val.load())] for i,name in enumerate(POLICY['settings'])]),
        Assert(cfg('baseFee')<=Int(1000000000000)),Assert(cfg('wordFee')<=Int(1000000000)),Assert(cfg('imageFee')<=Int(1000000000000)),
        Assert(cfg('minVotes')>=Int(1)),Assert(cfg('minVotes')<=cfg('members')),Assert(cfg('approvalBps')>=Int(1)),Assert(cfg('approvalBps')<=Int(10000)),
        Assert(cfg('hostBps')+cfg('rewardBps')<=Int(10000)),Assert(cfg('shortMax')>=Int(1)),Assert(cfg('mediumMax')>=cfg('shortMax')),Assert(cfg('slippageBps')<=Int(1000)),
        *[Assert(And(cfg(name)>=Int(1),cfg(name)<=Int(90))) for name in ['shortDays','mediumDays','longDays']],cp('revision',cfg('revision')+Int(1)))
    execute = Seq(Assert(Txn.sender()==addr('executor')),Assert(cfg('paused')==Int(0)),
        Assert(Txn.application_args.length()==Int(4)),Assert(Len(Txn.application_args[1])==Int(8)),Assert(Len(Txn.application_args[2])==Int(8)),
        loadp,Assert(pn('state')==Int(1)),index.store(Btoi(Txn.application_args[2])),Assert(index.load()<pn('actionCount')),
        Assert(Len(Txn.application_args[3])==pn('actionCount')*Int(AS)),
        Assert(Sha256(Txn.application_args[3])==App.box_extract(p.load(),Int(P['actionsHash']),Int(32))),
        Assert(pn('executed')==Exp(Int(2),index.load())-Int(1)),
        action.store(Extract(Txn.application_args[3],index.load()*Int(AS),Int(AS))),
        kind.store(an('kind')),asset.store(an('asset')),amount.store(an('amount')),outasset.store(an('outputAsset')),pool.store(Extract(action.load(),Int(A['pool']),Int(32))),
        Cond([kind.load()==Int(0),transfer(asset.load(),Extract(action.load(),Int(A['recipient']),Int(32)),amount.load())],
            [kind.load()==Int(1),Seq(Assert(asset.load()>Int(0)),opt(asset.load()))],[kind.load()==Int(2),swap],
            [kind.load()==Int(3),policy],[kind.load()==Int(4),Seq(Assert(an('setting')<=Int(2)),Assert(Extract(action.load(),Int(A['recipient']),Int(32))!=Global.zero_address()),
                Assert(Or(an('setting')!=Int(2),index.load()==pn('actionCount')-Int(1))),
                Cond(*[[an('setting')==Int(i),App.box_replace(CM,Int(C[name]),Extract(action.load(),Int(A['recipient']),Int(32)))] for i,name in enumerate(['host','quoteSigner','executor'])]),cp('revision',cfg('revision')+Int(1)))]),
        pp('executed',SetBit(pn('executed'),index.load(),Int(1))),Approve())
    return Seq(Assert(Txn.rekey_to()==Global.zero_address()),
        If(Txn.application_id()==Int(0)).Then(Approve()),
        If(Txn.on_completion()==OnComplete.UpdateApplication).Then(Return(Txn.sender()==Global.creator_address())),
        Assert(Txn.on_completion()==OnComplete.NoOp),Assert(Txn.application_args.length()>Int(0)),
        If(Txn.application_args[0]==Bytes('budget')).Then(Approve()),
        If(Txn.application_args[0]==Bytes('initialize')).Then(init), initialized,Assert(initialized.hasValue()),Assert(cfg('version')==Int(3)),
        Cond([Txn.application_args[0]==Bytes('propose'),propose],[Txn.application_args[0]==Bytes('vote'),vote],
            [Txn.application_args[0]==Bytes('finalize'),finalize],[Txn.application_args[0]==Bytes('claim'),claim],[Txn.application_args[0]==Bytes('execute'),execute],
            [Txn.application_args[0]==Bytes('pause'),Seq(Assert(Txn.sender()==Global.creator_address()),Assert(Btoi(Txn.application_args[1])<=Int(1)),cp('paused',Btoi(Txn.application_args[1])),Approve())]))

if __name__ == '__main__':
    dest=ROOT/'contracts/council-dao';dest.mkdir(exist_ok=True)
    (dest/'approval.teal').write_text(compileTeal(approval_program(),Mode.Application,version=8,assembleConstants=True))
    (dest/'clear.teal').write_text(compileTeal(Reject(),Mode.Signature,version=8))
    print('Compiled Council v3. No deployment or treasury transaction submitted.')
