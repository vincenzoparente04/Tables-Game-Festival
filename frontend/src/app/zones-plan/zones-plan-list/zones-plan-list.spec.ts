import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZonesPlanList } from './zones-plan-list';

describe('ZonesPlanList', () => {
  let component: ZonesPlanList;
  let fixture: ComponentFixture<ZonesPlanList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZonesPlanList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZonesPlanList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
